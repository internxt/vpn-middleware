import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../modules/auth/auth.service';
import { UsersService } from '../modules/users/users.service';
import { ProxyConnectService } from './method-handlers/connect-handler';
import { ProxyRequestService } from './method-handlers/request-handler';
import { ForwardProxyServer } from './proxy.service';
import { ZoneNotPermittedError } from './errors/zone-not-permitted.error';
import { newUser, newTier } from '../../test/fixtures';
import { freeTierId } from '../modules/users/constants';
import http from 'http';
import { Duplex } from 'stream';

const mockServiceLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('ForwardProxyServer', () => {
  let service: ForwardProxyServer;
  let mockRequestService: jest.Mocked<ProxyRequestService>;
  let mockConnectService: jest.Mocked<ProxyConnectService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockUsersService: jest.Mocked<UsersService>;

  const mockVpnConfigs = {
    zoneA: { address: 'http://zonea:1194', username: 'userA', pass: 'passA' },
    zoneB: { address: 'http://zoneb:1194', username: 'userB', pass: 'passB' },
  };

  beforeEach(async () => {
    Object.values(mockServiceLogger).forEach((mockFn) => mockFn.mockClear());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForwardProxyServer,
        {
          provide: ProxyRequestService,
          useValue: createMock<ProxyRequestService>(),
        },
        {
          provide: ProxyConnectService,
          useValue: createMock<ProxyConnectService>(),
        },
        { provide: AuthService, useValue: createMock<AuthService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        { provide: UsersService, useValue: createMock<UsersService>() },
        { provide: Logger, useValue: mockServiceLogger },
      ],
    }).compile();

    service = module.get<ForwardProxyServer>(ForwardProxyServer);
    mockRequestService = module.get(ProxyRequestService);
    mockConnectService = module.get(ProxyConnectService);
    mockAuthService = module.get(AuthService);
    mockConfigService = module.get(ConfigService);
    mockUsersService = module.get(UsersService);

    service['THROTTLING_SPEED'] = 125000;

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'vpns') {
        return mockVpnConfigs;
      }
      if (key === 'proxyPort') {
        return 8080;
      }
      return undefined;
    });

    await service['loadVpnConfigs']();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Authentication and Authorization Logic (decodeUserFromToken)', () => {
    const region = 'zoneA';
    const token = 'valid-jwt-token';
    const authHeader = `Basic ${Buffer.from(`${region}:${token}`).toString('base64')}`;
    const mockUser = newUser({
      attributes: { uuid: 'user-uuid', zones: ['zoneA', 'zoneB'] },
      tiers: [
        newTier({ attributes: { id: 'paid-tier', zones: ['zoneA', 'zoneB'] } }),
      ],
    });

    it('should return decoded token info if auth is valid', async () => {
      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: mockUser.uuid,
        workspaces: { owners: [] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(mockUser as any);

      const result = await service['decodeUserFromToken'](authHeader);

      expect(mockAuthService.verifyProxyToken).toHaveBeenCalledWith(token);
      expect(mockUsersService.getUserAndTiers).toHaveBeenCalledWith(
        mockUser.uuid,
      );
      expect(result).toEqual({
        region: region,
        data: mockUser,
        isFreeUser: false,
      });
    });

    it('should return null if auth header is missing or uses wrong scheme', async () => {
      expect(await service['decodeUserFromToken'](undefined)).toBeNull();
      expect(
        await service['decodeUserFromToken']('Bearer some-token'),
      ).toBeNull();
      expect(mockAuthService.verifyProxyToken).not.toHaveBeenCalled();
    });

    it('should return null if basic auth content is malformed', async () => {
      expect(
        await service['decodeUserFromToken']('Basic invalidbase64'),
      ).toBeNull();
      expect(
        await service['decodeUserFromToken'](
          `Basic ${Buffer.from('justregion').toString('base64')}`,
        ),
      ).toBeNull();
    });

    it('should return null if token validation fails', async () => {
      mockAuthService.verifyProxyToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      const result = await service['decodeUserFromToken'](authHeader);
      expect(result).toBeNull();
      expect(mockUsersService.getUserAndTiers).not.toHaveBeenCalled();
    });

    it('should return null if user is not found (and creation fails)', async () => {
      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: 'non-existent-uuid',
        workspaces: { owners: [] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(null);
      mockUsersService.getOrCreateUserAndTiers.mockResolvedValue(null);

      const result = await service['decodeUserFromToken'](authHeader);
      expect(result).toBeNull();
    });

    it('should throw ZoneNotPermittedError if user zones dont include region', async () => {
      const userNoZoneAccess = newUser({
        attributes: { uuid: 'user-uuid', zones: ['zoneC'] },
        tiers: [newTier({ attributes: { id: 'paid-tier', zones: ['zoneC'] } })],
      });
      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: userNoZoneAccess.uuid,
        workspaces: { owners: [] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(
        userNoZoneAccess as any,
      );

      await expect(service['decodeUserFromToken'](authHeader)).rejects.toThrow(
        new ZoneNotPermittedError(region),
      );
    });

    it('should identify free user correctly', async () => {
      const freeTier = newTier({
        attributes: { id: freeTierId, zones: ['zoneA'] },
      });
      const freeUser = newUser({
        attributes: { uuid: 'free-user', zones: ['zoneA'] },
        tiers: [freeTier],
      });
      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: freeUser.uuid,
        workspaces: { owners: [] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(freeUser as any);

      const result = await service['decodeUserFromToken'](authHeader);
      expect(result.isFreeUser).toBe(true);
    });
  });

  describe('validateToken', () => {
    const token = 'valid-jwt-token';
    const mockUser = newUser({
      attributes: { uuid: 'user-uuid', zones: ['zoneA', 'zoneB'] },
      tiers: [
        newTier({ attributes: { id: 'paid-tier', zones: ['zoneA', 'zoneB'] } }),
      ],
    });

    it('should validate token and return user with tiers', async () => {
      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: mockUser.uuid,
        workspaces: { owners: [] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(mockUser as any);

      const result = await service['validateToken'](token);

      expect(mockAuthService.verifyProxyToken).toHaveBeenCalledWith(token);
      expect(mockUsersService.getUserAndTiers).toHaveBeenCalledWith(
        mockUser.uuid,
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle non-existent user by creating a free user', async () => {
      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: 'new-user-uuid',
        workspaces: { owners: [] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(null);
      mockUsersService.getOrCreateUserAndTiers.mockResolvedValue(
        mockUser as any,
      );

      const result = await service['validateToken'](token);

      expect(mockUsersService.getOrCreateUserAndTiers).toHaveBeenCalledWith(
        'new-user-uuid',
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if token validation fails', async () => {
      mockAuthService.verifyProxyToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      const result = await service['validateToken'](token);
      expect(result).toBeNull();
    });

    it('should merge tiers and zones from workspace owners', async () => {
      const owner1 = newUser({
        attributes: { uuid: 'owner1', zones: ['zoneC'] },
        tiers: [
          newTier({ attributes: { id: 'owner-tier', zones: ['zoneC'] } }),
        ],
      });
      const owner2 = newUser({
        attributes: { uuid: 'owner2', zones: ['zoneD'] },
        tiers: [
          newTier({ attributes: { id: 'owner2-tier', zones: ['zoneD'] } }),
        ],
      });

      mockAuthService.verifyProxyToken.mockResolvedValue({
        uuid: mockUser.uuid,
        workspaces: { owners: ['owner1', 'owner2'] },
      });
      mockUsersService.getUserAndTiers.mockResolvedValue(mockUser as any);
      mockUsersService.getUserByUuid.mockImplementation((uuid) => {
        if (uuid === 'owner1') return owner1 as any;
        if (uuid === 'owner2') return owner2 as any;
        return null;
      });

      const result = await service['validateToken'](token);

      expect(mockUsersService.getUserByUuid).toHaveBeenCalledWith('owner1');
      expect(mockUsersService.getUserByUuid).toHaveBeenCalledWith('owner2');

      expect(result.tiers).toEqual(
        expect.arrayContaining([
          ...mockUser.tiers,
          ...owner1.tiers,
          ...owner2.tiers,
        ]),
      );

      expect(result.zones).toContain('zoneA');
      expect(result.zones).toContain('zoneB');
      expect(result.zones).toContain('zoneC');
      expect(result.zones).toContain('zoneD');
    });
  });

  describe('getVpnCredentials', () => {
    it('should return the correct VPN config for a valid region', () => {
      const region = 'zoneA';
      const expectedConfig = {
        address: mockVpnConfigs.zoneA.address,
        auth: {
          username: mockVpnConfigs.zoneA.username,
          password: mockVpnConfigs.zoneA.pass,
        },
      };
      const result = service['getVpnCredentials'](region);
      expect(result).toEqual(expectedConfig);
    });

    it('should return null for an unknown region', () => {
      const region = 'zoneUnknown';
      const result = service['getVpnCredentials'](region);
      expect(result).toBeNull();
    });
  });

  describe('isFreeTier', () => {
    it('should identify free tier correctly', () => {
      const freeTier = newTier({ attributes: { id: freeTierId } });
      const paidTier = newTier({ attributes: { id: 'paid-tier' } });

      expect(service['isFreeTier'](freeTier as any)).toBe(true);
      expect(service['isFreeTier'](paidTier as any)).toBe(false);
    });
  });

  describe('loadVpnConfigs', () => {
    it('should load VPN configs from environment', () => {
      service['loadVpnConfigs']();
      expect(service['vpns']).toEqual(mockVpnConfigs);
    });
  });

  describe('startProxyServer', () => {
    let mockServer: jest.Mocked<http.Server>;
    let mockCreateServer: jest.SpyInstance;

    beforeEach(() => {
      Object.values(mockServiceLogger).forEach((mock) => mock.mockClear());

      mockServer = createMock<http.Server>();
      mockServer.on.mockReturnValue(mockServer);
      mockServer.listen.mockImplementation((port, callback) => {
        if (callback) callback();
        return mockServer;
      });

      mockCreateServer = jest
        .spyOn(http, 'createServer')
        .mockReturnValue(mockServer);

      jest.spyOn(service as any, 'decodeUserFromToken');
      jest.spyOn(service as any, 'getVpnCredentials');
    });

    afterEach(() => {
      mockCreateServer.mockRestore();
    });

    it('should create an HTTP server and start listening', async () => {
      await service.startProxyServer();

      expect(mockCreateServer).toHaveBeenCalled();
      expect(mockServer.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockServer.listen).toHaveBeenCalledWith(
        8080,
        expect.any(Function),
      );
    });

    it('should handle HTTP requests with authentication', async () => {
      let requestHandler;
      mockCreateServer.mockImplementation((handler) => {
        requestHandler = handler;
        return mockServer;
      });

      await service.startProxyServer();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic dGVzdDp0b2tlbg==' },
      } as http.IncomingMessage;

      const mockRes = createMock<http.ServerResponse>();

      const mockToken = {
        region: 'zoneA',
        data: newUser(),
        isFreeUser: false,
      };

      service['decodeUserFromToken'] = jest.fn().mockResolvedValue(mockToken);
      service['getVpnCredentials'] = jest.fn().mockReturnValue({
        address: 'http://vpn:1194',
        auth: { username: 'user', password: 'pass' },
      });

      await requestHandler(mockReq, mockRes);

      expect(service['decodeUserFromToken']).toHaveBeenCalledWith(
        'Basic dGVzdDp0b2tlbg==',
      );

      expect(mockRequestService.handleRequest).toHaveBeenCalledWith({
        proxyUrl: 'http://vpn:1194',
        proxyAuth: { username: 'user', password: 'pass' },
        req: mockReq,
        res: mockRes,
        throttlingSpeed: 0,
      });
    });

    it('should handle authentication failures in HTTP requests', async () => {
      let requestHandler;
      mockCreateServer.mockImplementation((handler) => {
        requestHandler = handler;
        return mockServer;
      });

      await service.startProxyServer();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic invalid' },
      } as http.IncomingMessage;

      const mockRes = createMock<http.ServerResponse>();

      service['decodeUserFromToken'] = jest.fn().mockResolvedValue(null);

      await requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(407, {
        'Proxy-Authenticate': 'Basic realm="Proxy"',
      });
      expect(mockRes.end).toHaveBeenCalledWith(
        '407 Invalid token, proxy authentication required',
      );

      expect(mockRequestService.handleRequest).not.toHaveBeenCalled();
    });

    it('should handle zone permission errors in HTTP requests', async () => {
      let requestHandler;
      mockCreateServer.mockImplementation((handler) => {
        requestHandler = handler;
        return mockServer;
      });

      await service.startProxyServer();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic dGVzdDp0b2tlbg==' },
      } as http.IncomingMessage;

      const mockRes = createMock<http.ServerResponse>();

      service['decodeUserFromToken'] = jest
        .fn()
        .mockRejectedValue(new ZoneNotPermittedError('zoneA'));

      await requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(403, {
        'Content-Type': 'text/plain',
      });
      expect(mockRes.end).toHaveBeenCalledWith(
        '403 Forbidden - Zone access not permitted',
      );

      expect(mockRequestService.handleRequest).not.toHaveBeenCalled();
    });

    it('should handle CONNECT requests with authentication', async () => {
      let capturedConnectHandler: Function;

      mockServer.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          capturedConnectHandler = handler;
        }
        return mockServer;
      });

      await service.startProxyServer();

      expect(capturedConnectHandler).toBeDefined();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic dGVzdDp0b2tlbg==' },
      } as http.IncomingMessage;

      const mockSocket = createMock<Duplex>();
      const mockHead = Buffer.from('');

      const mockToken = {
        region: 'zoneA',
        data: newUser(),
        isFreeUser: false,
      };

      service['decodeUserFromToken'] = jest.fn().mockResolvedValue(mockToken);
      service['getVpnCredentials'] = jest.fn().mockReturnValue({
        address: 'http://vpn:1194',
        auth: { username: 'user', password: 'pass' },
      });

      await capturedConnectHandler(mockReq, mockSocket, mockHead);

      expect(service['decodeUserFromToken']).toHaveBeenCalledWith(
        'Basic dGVzdDp0b2tlbg==',
      );
      expect(service['getVpnCredentials']).toHaveBeenCalledWith('zoneA');
      expect(mockConnectService.handleConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          proxyUrl: 'http://vpn:1194',
          proxyAuth: { username: 'user', password: 'pass' },
          clientSocket: mockSocket,
          req: mockReq,
          throttlingSpeed: 0,
        }),
      );
    });

    it('should handle authentication failures in CONNECT requests', async () => {
      let capturedConnectHandler: Function;

      mockServer.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          capturedConnectHandler = handler;
        }
        return mockServer;
      });

      await service.startProxyServer();

      expect(capturedConnectHandler).toBeDefined();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic invalid' },
      } as http.IncomingMessage;

      const mockSocket = createMock<Duplex>();
      const mockHead = Buffer.from('');

      service['decodeUserFromToken'] = jest.fn().mockResolvedValue(null);

      await capturedConnectHandler(mockReq, mockSocket, mockHead);

      expect(mockSocket.write).toHaveBeenCalledWith(
        'HTTP/1.1 407 Proxy Authentication Required\r\n',
      );
      expect(mockSocket.end).toHaveBeenCalled();

      expect(mockConnectService.handleConnect).not.toHaveBeenCalled();
    });

    it('should handle zone permission errors in CONNECT requests', async () => {
      let capturedConnectHandler: Function;

      mockServer.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          capturedConnectHandler = handler;
        }
        return mockServer;
      });

      await service.startProxyServer();

      expect(capturedConnectHandler).toBeDefined();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic dGVzdDp0b2tlbg==' },
      } as http.IncomingMessage;

      const mockSocket = createMock<Duplex>();
      const mockHead = Buffer.from('');

      service['decodeUserFromToken'] = jest
        .fn()
        .mockRejectedValue(new ZoneNotPermittedError('zoneA'));

      await capturedConnectHandler(mockReq, mockSocket, mockHead);

      expect(mockSocket.write).toHaveBeenCalledWith(
        'HTTP/1.1 403 Forbidden\r\n',
      );
      expect(mockSocket.end).toHaveBeenCalled();

      expect(mockConnectService.handleConnect).not.toHaveBeenCalled();
    });

    it('should apply throttling for free users', async () => {
      let requestHandler;
      mockCreateServer.mockImplementation((handler) => {
        requestHandler = handler;
        return mockServer;
      });

      await service.startProxyServer();

      const mockReq = {
        headers: { 'proxy-authorization': 'Basic dGVzdDp0b2tlbg==' },
      } as http.IncomingMessage;

      const mockRes = createMock<http.ServerResponse>();

      const mockToken = {
        region: 'zoneA',
        data: newUser(),
        isFreeUser: true,
      };

      service['decodeUserFromToken'] = jest.fn().mockResolvedValue(mockToken);
      service['getVpnCredentials'] = jest.fn().mockReturnValue({
        address: 'http://vpn:1194',
        auth: { username: 'user', password: 'pass' },
      });

      await requestHandler(mockReq, mockRes);

      expect(mockRequestService.handleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          throttlingSpeed: 125000,
        }),
      );
    });
  });
});

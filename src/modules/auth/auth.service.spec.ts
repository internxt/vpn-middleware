import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthTokenPayload } from './interfaces';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyProxyToken', () => {
    it('should verify a valid token and return its payload', async () => {
      const token = 'valid.jwt.token';
      const expectedPayload: AuthTokenPayload = {
        uuid: 'user-uuid',
        workspaces: { owners: ['owner1'] },
      };
      const decodedToken = { payload: expectedPayload };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(decodedToken);

      const payload = await service.verifyProxyToken(token);

      expect(payload).toEqual(expectedPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token);
    });

    it('should throw an error for an invalid token', async () => {
      const token = 'invalid.jwt.token';
      const error = new Error('Invalid token');
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(error);

      await expect(service.verifyProxyToken(token)).rejects.toThrow(error);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token);
    });
  });

  describe('createProxyToken', () => {
    it('should create a token with the given payload', async () => {
      const payload: AuthTokenPayload = {
        uuid: 'user-uuid',
        workspaces: { owners: [] },
      };
      const expectedToken = 'new.jwt.token';
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(expectedToken);

      const token = await service.createProxyToken(payload);

      expect(token).toEqual(expectedToken);
      expect(jwtService.signAsync).toHaveBeenCalledWith({ payload }, {});
    });

    it('should create a token with expiry if expiresIn is provided', async () => {
      const payload: AuthTokenPayload = { uuid: 'user-uuid' };
      const expiresIn = '1h';
      const expectedToken = 'new.jwt.token.expiring';
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(expectedToken);

      const token = await service.createProxyToken(payload, expiresIn);

      expect(token).toEqual(expectedToken);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { payload },
        { expiresIn },
      );
    });
  });
});

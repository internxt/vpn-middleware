import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import http from 'http';
import https from 'https';
import { Duplex, pipeline } from 'stream';
import { Throttle } from 'stream-throttle';
import { ProxyConnectService } from './connect-handler';

const mockProxySocket = createMock<Duplex>();
const mockClientSocket = createMock<Duplex>();
const mockReq = createMock<http.IncomingMessage>();
const mockRes = createMock<http.ServerResponse>();
const mockHttpRequest = createMock<http.ClientRequest>();
const mockHttpsRequest = createMock<http.ClientRequest>();

jest.mock('stream', () => ({
  ...jest.requireActual('stream'),
  pipeline: jest.fn((...args) => {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback(null);
    }
    return createMock<Duplex>();
  }),
}));

jest.mock('stream-throttle', () => ({
  Throttle: jest.fn().mockImplementation(() => createMock<Throttle>()),
}));

jest.mock('http', () => ({
  ...jest.requireActual('http'),
  request: jest.fn(() => mockHttpRequest),
}));

jest.mock('https', () => ({
  ...jest.requireActual('https'),
  request: jest.fn(() => mockHttpsRequest),
}));

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('ProxyConnectService', () => {
  let service: ProxyConnectService;

  const connectArgs = {
    proxyUrl: 'http://proxy.example.com:8080',
    proxyAuth: { username: 'proxyUser', password: 'proxyPass' },
    clientSocket: mockClientSocket,
    req: {
      ...mockReq,
      url: 'target.example.com:443',
      headers: { 'user-agent': 'test' },
    } as http.IncomingMessage,
    throttlingSpeed: 0,
  };

  const expectedAuthHeader = `Basic ${Buffer.from('proxyUser:proxyPass').toString('base64')}`;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockHttpRequest.removeAllListeners();
    mockHttpsRequest.removeAllListeners();
    mockClientSocket.removeAllListeners();
    mockProxySocket.removeAllListeners();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyConnectService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProxyConnectService>(ProxyConnectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleConnect', () => {
    it('should use http.request for http proxyUrl', () => {
      service.handleConnect({
        ...connectArgs,
        proxyUrl: 'http://proxy.example.com:8080',
      });
      expect(http.request).toHaveBeenCalled();
      expect(https.request).not.toHaveBeenCalled();
      expect(mockHttpRequest.end).toHaveBeenCalled();
    });

    it('should use https.request for https proxyUrl', () => {
      service.handleConnect({
        ...connectArgs,
        proxyUrl: 'https://proxy.example.com:8080',
      });
      expect(https.request).toHaveBeenCalled();
      expect(http.request).not.toHaveBeenCalled();
      expect(mockHttpsRequest.end).toHaveBeenCalled();
    });

    it('should correctly format request options and add proxy auth', () => {
      service.handleConnect(connectArgs);

      const expectedOptions = {
        method: connectArgs.req.method,
        hostname: 'proxy.example.com',
        port: '8080',
        path: connectArgs.req.url,
        headers: {
          'user-agent': 'test',
          'proxy-authorization': expectedAuthHeader,
          Host: 'target.example.com',
        },
        rejectUnauthorized: false,
      };

      expect(http.request).toHaveBeenCalledWith(expectedOptions);
    });

    it('should write 200 OK and pipeline sockets on successful connect', () => {
      service.handleConnect(connectArgs);

      const connectCallback = mockHttpRequest.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      expect(connectCallback).toBeDefined();
      connectCallback(mockRes, mockProxySocket);

      expect(mockClientSocket.write).toHaveBeenCalledWith(
        'HTTP/1.1 200 OK\r\n\r\n',
      );
      expect(pipeline).toHaveBeenCalledWith(
        mockClientSocket,
        mockProxySocket,
        mockClientSocket,
        expect.any(Function),
      );
      expect(Throttle).not.toHaveBeenCalled();
    });

    it('should setup pipeline with throttling if speed is provided', () => {
      const throttlingSpeed = 125000;
      service.handleConnect({ ...connectArgs, throttlingSpeed });

      const connectCallback = mockHttpRequest.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      expect(connectCallback).toBeDefined();
      connectCallback(mockRes, mockProxySocket);

      expect(mockClientSocket.write).toHaveBeenCalledWith(
        'HTTP/1.1 200 OK\r\n\r\n',
      );
      expect(Throttle).toHaveBeenCalledTimes(2);
      expect(Throttle).toHaveBeenCalledWith({ rate: throttlingSpeed });
      expect(pipeline).toHaveBeenCalledWith(
        mockClientSocket,
        expect.any(Object),
        mockProxySocket,
        expect.any(Object),
        mockClientSocket,
        expect.any(Function),
      );
    });

    it('should handle proxy request error', () => {
      service.handleConnect(connectArgs);
      const error = new Error('Proxy connection failed');

      const errorCallback = mockHttpRequest.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];
      expect(errorCallback).toBeDefined();
      errorCallback(error);

      expect(mockClientSocket.end).toHaveBeenCalledWith(
        'Error connecting through proxy',
      );
    });

    it('should handle client socket error', () => {
      service.handleConnect(connectArgs);
      const error = new Error('Client disconnected');

      const errorCallback = mockClientSocket.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];
      expect(errorCallback).toBeDefined();
      errorCallback(error);

      expect(mockHttpRequest.destroy).toHaveBeenCalled();
      expect(mockClientSocket.destroy).toHaveBeenCalled();
    });
  });
});

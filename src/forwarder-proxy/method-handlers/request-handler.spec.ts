import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import http from 'http';
import https from 'https';
import { Duplex, pipeline } from 'stream';
import { Throttle } from 'stream-throttle';
import { ProxyRequestService } from './request-handler';

const mockHttpRequest = createMock<http.ClientRequest>();
const mockHttpsRequest = createMock<http.ClientRequest>();
const mockIncomingMessage = createMock<http.IncomingMessage>();
const mockServerResponse = createMock<http.ServerResponse>({
  req: mockIncomingMessage,
});
const mockProxyResponse = createMock<http.IncomingMessage>();

jest.mock('stream', () => ({
  ...jest.requireActual('stream'),
  pipeline: jest.fn((...args) => {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback(null);
    }
    const mockStream = createMock<Duplex>();
    mockStream.pipe.mockImplementation((destination) => destination);
    return mockStream;
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

describe('ProxyRequestService', () => {
  let service: ProxyRequestService;

  const requestArgs = {
    proxyUrl: 'http://proxy.example.com:8080',
    proxyAuth: { username: 'proxyUser', password: 'proxyPass' },
    req: mockIncomingMessage,
    res: mockServerResponse,
    throttlingSpeed: 0,
  };

  const expectedAuthHeader = `Basic ${Buffer.from('proxyUser:proxyPass').toString('base64')}`;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockIncomingMessage.url = 'http://target.example.com/path';
    mockIncomingMessage.headers = { 'user-agent': 'test-req' };
    mockIncomingMessage.method = 'GET';

    mockHttpRequest.removeAllListeners();
    mockHttpsRequest.removeAllListeners();
    mockIncomingMessage.removeAllListeners();
    mockProxyResponse.removeAllListeners();
    mockServerResponse.removeAllListeners();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxyRequestService],
    }).compile();

    service = module.get<ProxyRequestService>(ProxyRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should use http.request for http proxyUrl', () => {
      service.handleRequest({
        ...requestArgs,
        proxyUrl: 'http://proxy.example.com:8080',
      });
      expect(http.request).toHaveBeenCalled();
      expect(https.request).not.toHaveBeenCalled();
    });

    it('should use https.request for https proxyUrl', () => {
      service.handleRequest({
        ...requestArgs,
        proxyUrl: 'https://proxy.example.com:8443',
      });
      expect(https.request).toHaveBeenCalled();
      expect(http.request).not.toHaveBeenCalled();
    });

    it('should pipe req to proxyRequest and proxyResponse to res on successful response', () => {
      service.handleRequest(requestArgs);

      const responseCallback = mockHttpRequest.once.mock.calls.find(
        (call) => call[0] === 'response',
      )?.[1];
      expect(responseCallback).toBeDefined();
      mockProxyResponse.statusCode = 200;
      mockProxyResponse.headers = { 'content-type': 'text/plain' };
      responseCallback(mockProxyResponse);

      expect(mockServerResponse.writeHead).toHaveBeenCalledWith(
        200,
        mockProxyResponse.headers,
      );
      expect(mockIncomingMessage.pipe).toHaveBeenCalledWith(mockHttpRequest);
      expect(mockProxyResponse.pipe).toHaveBeenCalledWith(mockServerResponse);
      expect(pipeline).not.toHaveBeenCalled();
      expect(Throttle).not.toHaveBeenCalled();
    });

    it('should use pipeline with throttling when speed is provided', () => {
      const throttlingSpeed = 125000;
      service.handleRequest({ ...requestArgs, throttlingSpeed });

      const responseCallback = mockHttpRequest.once.mock.calls.find(
        (call) => call[0] === 'response',
      )?.[1];
      expect(responseCallback).toBeDefined();
      mockProxyResponse.statusCode = 200;
      responseCallback(mockProxyResponse);

      expect(Throttle).toHaveBeenCalledTimes(2);
      expect(Throttle).toHaveBeenCalledWith({ rate: throttlingSpeed });

      expect(pipeline).toHaveBeenCalledWith(
        mockIncomingMessage,
        expect.any(Object),
        mockHttpRequest,
        expect.any(Function),
      );
      expect(pipeline).toHaveBeenCalledWith(
        mockProxyResponse,
        expect.any(Object),
        mockServerResponse,
        expect.any(Function),
      );
      expect(mockIncomingMessage.pipe).not.toHaveBeenCalled();
      expect(mockProxyResponse.pipe).not.toHaveBeenCalled();
    });

    it('should handle proxy request error', () => {
      service.handleRequest(requestArgs);
      const error = new Error('Proxy connection failed');

      const errorCallback = mockHttpRequest.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];
      expect(errorCallback).toBeDefined();
      errorCallback(error);

      expect(mockServerResponse.statusCode).toBe(502);
      expect(mockServerResponse.end).toHaveBeenCalledWith(
        'Proxy request failed',
      );
    });

    it('should handle client request error', () => {
      service.handleRequest(requestArgs);
      const error = new Error('Client disconnected');

      const errorCallback = mockIncomingMessage.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];
      expect(errorCallback).toBeDefined();
      errorCallback(error);
    });

    it('should handle proxy response with no status code', () => {
      service.handleRequest(requestArgs);

      const responseCallback = mockHttpRequest.once.mock.calls.find(
        (call) => call[0] === 'response',
      )?.[1];
      expect(responseCallback).toBeDefined();
      mockProxyResponse.statusCode = undefined;
      mockProxyResponse.headers = { 'content-type': 'text/plain' };
      responseCallback(mockProxyResponse);

      expect(mockServerResponse.statusCode).toBe(502);
      expect(mockServerResponse.end).toHaveBeenCalledWith(
        'Invalid Proxy Request',
      );
      expect(mockProxyResponse.pipe).not.toHaveBeenCalled();
      expect(pipeline).not.toHaveBeenCalled();
    });
  });
});

/**
 * Tests for environment variable parsing and validation
 * Note: These tests require mocking process.env
 */

describe('Environment variable parsing', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset process.env before each test
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should parse comma-separated USER_ADDRESSES', () => {
        process.env.USER_ADDRESSES =
            '0x1234567890123456789012345678901234567890, 0x0987654321098765432109876543210987654321';
        process.env.PROXY_WALLET = '0x1111111111111111111111111111111111111111';
        process.env.PRIVATE_KEY = 'testkey';
        process.env.CLOB_HTTP_URL = 'https://clob.polymarket.com/';
        process.env.CLOB_WS_URL = 'wss://ws.polymarket.com/ws';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test';
        process.env.RPC_URL = 'https://polygon-rpc.com';
        process.env.USDC_CONTRACT_ADDRESS = '0x2222222222222222222222222222222222222222';

        const { ENV } = require('../env');
        expect(ENV.USER_ADDRESSES).toHaveLength(2);
        expect(ENV.USER_ADDRESSES[0]).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should parse JSON array USER_ADDRESSES', () => {
        process.env.USER_ADDRESSES =
            '["0x1234567890123456789012345678901234567890", "0x0987654321098765432109876543210987654321"]';
        process.env.PROXY_WALLET = '0x1111111111111111111111111111111111111111';
        process.env.PRIVATE_KEY = 'testkey';
        process.env.CLOB_HTTP_URL = 'https://clob.polymarket.com/';
        process.env.CLOB_WS_URL = 'wss://ws.polymarket.com/ws';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test';
        process.env.RPC_URL = 'https://polygon-rpc.com';
        process.env.USDC_CONTRACT_ADDRESS = '0x2222222222222222222222222222222222222222';

        const { ENV } = require('../env');
        expect(ENV.USER_ADDRESSES).toHaveLength(2);
    });

    it('should reject invalid Ethereum address', () => {
        process.env.USER_ADDRESSES = 'invalid-address';
        process.env.PROXY_WALLET = '0x1111111111111111111111111111111111111111';
        process.env.PRIVATE_KEY = 'testkey';
        process.env.CLOB_HTTP_URL = 'https://clob.polymarket.com/';
        process.env.CLOB_WS_URL = 'wss://ws.polymarket.com/ws';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test';
        process.env.RPC_URL = 'https://polygon-rpc.com';
        process.env.USDC_CONTRACT_ADDRESS = '0x2222222222222222222222222222222222222222';

        expect(() => {
            require('../env');
        }).toThrow('Invalid Ethereum address');
    });

    it('should reject invalid FETCH_INTERVAL', () => {
        process.env.USER_ADDRESSES = '0x1234567890123456789012345678901234567890';
        process.env.PROXY_WALLET = '0x1111111111111111111111111111111111111111';
        process.env.PRIVATE_KEY = 'testkey';
        process.env.CLOB_HTTP_URL = 'https://clob.polymarket.com/';
        process.env.CLOB_WS_URL = 'wss://ws.polymarket.com/ws';
        process.env.MONGO_URI = 'mongodb://localhost:27017/test';
        process.env.RPC_URL = 'https://polygon-rpc.com';
        process.env.USDC_CONTRACT_ADDRESS = '0x2222222222222222222222222222222222222222';
        process.env.FETCH_INTERVAL = '-1';

        expect(() => {
            require('../env');
        }).toThrow('Invalid FETCH_INTERVAL');
    });
});

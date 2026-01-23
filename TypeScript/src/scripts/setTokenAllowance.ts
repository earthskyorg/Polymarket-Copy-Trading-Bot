import { ethers } from 'ethers';
import { getContractConfig } from '@polymarket/clob-client';
import { ENV } from '../config/env';

const PROXY_WALLET = ENV.PROXY_WALLET;
const PRIVATE_KEY = ENV.PRIVATE_KEY;
const RPC_URL = ENV.RPC_URL;
const POLYGON_CHAIN_ID = 137;

// Polymarket Exchange address where tokens need to be approved
const POLYMARKET_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

// CTF (Conditional Token Framework) contract address
const CTF_CONTRACT = getContractConfig(POLYGON_CHAIN_ID).conditionalTokens;

// ERC1155 approve for all ABI
const CTF_ABI = [
    'function setApprovalForAll(address operator, bool approved) external',
    'function isApprovedForAll(address account, address operator) view returns (bool)',
];

async function setTokenAllowance() {
    console.log('🔑 Setting Token Allowance for Polymarket Trading');
    console.log('═══════════════════════════════════════════════\n');

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`📍 Wallet: ${PROXY_WALLET}`);
    console.log(`📍 CTF Contract: ${CTF_CONTRACT}`);
    console.log(`📍 Polymarket Exchange: ${POLYMARKET_EXCHANGE}\n`);

    try {
        // Create CTF contract instance
        const ctfContract = new ethers.Contract(CTF_CONTRACT, CTF_ABI, wallet);

        // Check current approval status
        console.log('🔍 Checking current approval status...');
        const isApproved = await ctfContract.isApprovedForAll(PROXY_WALLET, POLYMARKET_EXCHANGE);

        if (isApproved) {
            console.log('✅ Tokens are already approved for trading!');
            console.log('✅ You can now sell your positions.\n');
            return;
        }

        console.log('⚠️  Tokens are NOT approved for trading');
        console.log('📝 Setting approval for all tokens...\n');

        // Get current gas price and add 50% buffer
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice
            ? feeData.gasPrice.mul(150).div(100)
            : ethers.utils.parseUnits('50', 'gwei');

        console.log(`⛽ Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`);

        // Approve Polymarket Exchange to trade all your CT tokens
        const tx = await ctfContract.setApprovalForAll(POLYMARKET_EXCHANGE, true, {
            gasPrice: gasPrice,
            gasLimit: 100000,
        });

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...\n');

        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log('✅ Success! Tokens are now approved for trading!');
            console.log(`🔗 Transaction: https://polygonscan.com/tx/${tx.hash}\n`);

            // Verify approval
            const newApprovalStatus = await ctfContract.isApprovedForAll(
                PROXY_WALLET,
                POLYMARKET_EXCHANGE
            );
            if (newApprovalStatus) {
                console.log('✅ Verification: Approval confirmed on-chain');
                console.log('✅ You can now run: npm run manual-sell\n');
            }
        } else {
            console.log('❌ Transaction failed!');
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log('\n⚠️  You need MATIC for gas fees on Polygon!');
        }
    }
}

setTokenAllowance()
    .then(() => {
        console.log('✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });

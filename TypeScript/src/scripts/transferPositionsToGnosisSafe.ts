import { ethers } from 'ethers';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PRIVATE_KEY = ENV.PRIVATE_KEY;
const RPC_URL = ENV.RPC_URL;

const EOA_ADDRESS = '0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C';
const GNOSIS_SAFE_ADDRESS = '0xd62531bc536bff72394fc5ef715525575787e809';

// Polymarket Conditional Tokens contract на Polygon (ERC1155)
const CONDITIONAL_TOKENS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

interface Position {
    asset: string;
    conditionId: string;
    size: number;
    avgPrice: number;
    currentValue: number;
    cashPnl: number;
    percentPnl: number;
    curPrice: number;
    title?: string;
    slug?: string;
    outcome?: string;
}

async function transferPositions() {
    console.log('\n🔄 TRANSFERRING POSITIONS FROM EOA TO GNOSIS SAFE\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📍 Addresses:\n');
    console.log(`   FROM (EOA):          ${EOA_ADDRESS}`);
    console.log(`   TO (Gnosis Safe):    ${GNOSIS_SAFE_ADDRESS}\n`);

    // 1. Get all positions on EOA
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 1: Getting positions on EOA\n');

    const positions: Position[] = await fetchData(
        `https://data-api.polymarket.com/positions?user=${EOA_ADDRESS}`
    );

    if (!positions || positions.length === 0) {
        console.log('❌ No positions on EOA to transfer\n');
        return;
    }

    console.log(`✅ Found positions: ${positions.length}`);
    console.log(
        `💰 Total value: $${positions.reduce((s, p) => s + p.currentValue, 0).toFixed(2)}\n`
    );

    // 2. Connect to network
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 2: Connecting to Polygon\n');

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`✅ Connected to Polygon\n`);
    console.log(`   Wallet: ${wallet.address}\n`);

    // Check that this is the correct wallet
    if (wallet.address.toLowerCase() !== EOA_ADDRESS.toLowerCase()) {
        console.log('❌ ERROR: Private key does not match EOA address!\n');
        console.log(`   Expected: ${EOA_ADDRESS}`);
        console.log(`   Got:      ${wallet.address}\n`);
        return;
    }

    // 3. ERC1155 ABI for safeTransferFrom
    const erc1155Abi = [
        'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
        'function balanceOf(address account, uint256 id) view returns (uint256)',
        'function isApprovedForAll(address account, address operator) view returns (bool)',
        'function setApprovalForAll(address operator, bool approved)',
    ];

    // 4. Transfer each position
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 3: Transferring positions\n');

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];

        console.log(`\n📦 Position ${i + 1}/${positions.length}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Market: ${pos.title || 'Unknown'}`);
        console.log(`Outcome: ${pos.outcome || 'Unknown'}`);
        console.log(`Size: ${pos.size.toFixed(2)} shares`);
        console.log(`Value: $${pos.currentValue.toFixed(2)}`);
        console.log(`Token ID: ${pos.asset.slice(0, 20)}...`);

        try {
            // Conditional Tokens contract (stores ERC1155 tokens)
            const ctfContract = new ethers.Contract(CONDITIONAL_TOKENS, erc1155Abi, wallet);

            // Check balance on EOA
            const balance = await ctfContract.balanceOf(EOA_ADDRESS, pos.asset);
            console.log(`\n📊 Balance on EOA: ${ethers.utils.formatUnits(balance, 0)} tokens`);

            if (balance.isZero()) {
                console.log('⚠️  Skip: Balance is zero\n');
                failureCount++;
                continue;
            }

            // Get gas price
            const gasPrice = await provider.getGasPrice();
            const gasPriceWithBuffer = gasPrice.mul(150).div(100); // +50% buffer

            console.log(
                `⛽ Gas price: ${ethers.utils.formatUnits(gasPriceWithBuffer, 'gwei')} Gwei\n`
            );

            // Check approval
            const isApproved = await ctfContract.isApprovedForAll(EOA_ADDRESS, GNOSIS_SAFE_ADDRESS);
            if (!isApproved) {
                console.log('🔓 Setting approval for Gnosis Safe...');
                const approveTx = await ctfContract.setApprovalForAll(GNOSIS_SAFE_ADDRESS, true, {
                    gasPrice: gasPriceWithBuffer,
                    gasLimit: 100000,
                });
                await approveTx.wait();
                console.log('✅ Approval set\n');
            }

            // Transfer tokens
            console.log(`🔄 Transferring ${ethers.utils.formatUnits(balance, 0)} tokens...`);

            const transferTx = await ctfContract.safeTransferFrom(
                EOA_ADDRESS,
                GNOSIS_SAFE_ADDRESS,
                pos.asset,
                balance,
                '0x', // empty data
                {
                    gasPrice: gasPriceWithBuffer,
                    gasLimit: 200000,
                }
            );

            console.log(`⏳ TX sent: ${transferTx.hash}`);
            console.log('⏳ Waiting for confirmation...');

            const receipt = await transferTx.wait();

            console.log(`✅ SUCCESS! Block: ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

            successCount++;

            // Pause between transfers
            if (i < positions.length - 1) {
                console.log('\n⏳ Pausing 3 seconds...\n');
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        } catch (error: any) {
            console.log(`\n❌ ERROR during transfer:`);
            console.log(`   ${error.message}\n`);
            failureCount++;
        }
    }

    // 5. Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TRANSFER SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`✅ Successfully transferred: ${successCount}/${positions.length}`);
    console.log(`❌ Errors: ${failureCount}/${positions.length}\n`);

    // 6. Check result
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 4: Checking result\n');

    console.log('⏳ Waiting 5 seconds for API data to update...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const eoaPositionsAfter: Position[] = await fetchData(
        `https://data-api.polymarket.com/positions?user=${EOA_ADDRESS}`
    );

    const gnosisPositionsAfter: Position[] = await fetchData(
        `https://data-api.polymarket.com/positions?user=${GNOSIS_SAFE_ADDRESS}`
    );

    console.log('📊 AFTER TRANSFER:\n');
    console.log(`   EOA:          ${eoaPositionsAfter?.length || 0} positions`);
    console.log(`   Gnosis Safe:  ${gnosisPositionsAfter?.length || 0} positions\n`);

    if (gnosisPositionsAfter && gnosisPositionsAfter.length > 0) {
        console.log('✅ Positions successfully transferred to Gnosis Safe!\n');
        console.log('🔗 Check on Polymarket:\n');
        console.log(`   https://polymarket.com/profile/${GNOSIS_SAFE_ADDRESS}\n`);
    } else {
        console.log('⚠️  API has not updated yet. Wait a few minutes and check manually.\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Script completed!\n');
}

transferPositions().catch((error) => {
    console.error('\n❌ Critical error:', error);
    process.exit(1);
});

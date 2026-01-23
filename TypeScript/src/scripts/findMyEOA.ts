import { ethers } from 'ethers';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PRIVATE_KEY = ENV.PRIVATE_KEY;
const PROXY_WALLET = ENV.PROXY_WALLET;
const RPC_URL = ENV.RPC_URL;

async function analyzeWallets() {
    console.log('\n🔍 WALLET AND ADDRESS ANALYSIS\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Get EOA address from private key
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const eoaAddress = wallet.address;

    console.log('📋 STEP 1: Address from private key (EOA)\n');
    console.log(`   ${eoaAddress}\n`);

    // 2. Show PROXY_WALLET from .env
    console.log('📋 STEP 2: PROXY_WALLET from .env\n');
    console.log(`   ${PROXY_WALLET}\n`);

    // 3. Compare
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔎 COMPARISON:\n');

    if (eoaAddress.toLowerCase() === PROXY_WALLET.toLowerCase()) {
        console.log('   ⚠️  EOA AND PROXY_WALLET ARE THE SAME ADDRESS!\n');
        console.log('   This means that .env contains an EOA address, not a proxy wallet.\n');
        console.log('   Polymarket should have created a separate proxy wallet for this EOA,');
        console.log('   but the bot uses the EOA directly.\n');
    } else {
        console.log('   ✅ EOA and PROXY_WALLET are different addresses\n');
        console.log('   EOA (owner):     ', eoaAddress);
        console.log('   PROXY (trading):', PROXY_WALLET, '\n');
    }

    // 4. Check if PROXY_WALLET is a smart contract
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 3: Checking PROXY_WALLET type\n');

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(PROXY_WALLET);
    const isContract = code !== '0x';

    if (isContract) {
        console.log('   ✅ PROXY_WALLET is a smart contract (Gnosis Safe)\n');
        console.log('   This is the correct configuration for Polymarket.\n');
    } else {
        console.log('   ⚠️  PROXY_WALLET is NOT a smart contract!\n');
        console.log('   This is a regular EOA address.\n');
        console.log('   Polymarket usually uses a Gnosis Safe proxy.\n');
    }

    // 5. Check activity on both addresses
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 4: Activity on Polymarket\n');

    try {
        const proxyPositions: any[] = await fetchData(
            `https://data-api.polymarket.com/positions?user=${PROXY_WALLET}`
        );
        console.log(`   PROXY_WALLET (${PROXY_WALLET.slice(0, 10)}...):`);
        console.log(`   • Positions: ${proxyPositions?.length || 0}\n`);

        if (eoaAddress.toLowerCase() !== PROXY_WALLET.toLowerCase()) {
            const eoaPositions: any[] = await fetchData(
                `https://data-api.polymarket.com/positions?user=${eoaAddress}`
            );
            console.log(`   EOA (${eoaAddress.slice(0, 10)}...):`);
            console.log(`   • Positions: ${eoaPositions?.length || 0}\n`);
        }
    } catch (error) {
        console.log('   ⚠️  Failed to get position data\n');
    }

    // 6. Check connection via activity API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 STEP 5: Checking proxyWallet in transactions\n');

    try {
        const activities: any[] = await fetchData(
            `https://data-api.polymarket.com/activity?user=${PROXY_WALLET}&type=TRADE`
        );

        if (activities && activities.length > 0) {
            const firstTrade = activities[0];
            const proxyWalletInTrade = firstTrade.proxyWallet;

            console.log(`   Address from .env:      ${PROXY_WALLET}`);
            console.log(`   proxyWallet in trades: ${proxyWalletInTrade}\n`);

            if (proxyWalletInTrade.toLowerCase() === PROXY_WALLET.toLowerCase()) {
                console.log('   ✅ Addresses match!\n');
            } else {
                console.log('   ⚠️  ADDRESSES DO NOT MATCH!\n');
                console.log('   This may mean Polymarket uses a different proxy.\n');
            }
        }
    } catch (error) {
        console.log('   ⚠️  Failed to check transactions\n');
    }

    // 7. Instructions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 HOW TO ACCESS POSITIONS ON FRONTEND:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔧 OPTION 1: Import private key into MetaMask\n');
    console.log('   1. Open MetaMask');
    console.log('   2. Click account icon -> Import Account');
    console.log('   3. Paste your PRIVATE_KEY from .env file');
    console.log('   4. Connect to Polymarket with this account');
    console.log('   5. Polymarket will automatically show the correct proxy wallet\n');

    console.log('⚠️  WARNING: Never share your private key!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 OPTION 2: Find proxy wallet via URL\n');
    console.log(`   Your positions are available at:\n`);
    console.log(`   https://polymarket.com/profile/${PROXY_WALLET}\n`);
    console.log(`   Open this link in a browser to view.\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 OPTION 3: Check via Polygon Explorer\n');
    console.log(`   https://polygonscan.com/address/${PROXY_WALLET}\n`);
    console.log(`   Here you can see all transactions and tokens.\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 8. Additional information
    console.log('📚 ADDITIONAL INFORMATION:\n');
    console.log('   • EOA (Externally Owned Account) - your main wallet');
    console.log('   • Proxy Wallet - smart contract for trading on Polymarket');
    console.log('   • One EOA can only have one proxy wallet on Polymarket');
    console.log('   • All positions are stored in proxy wallet, not in EOA\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 9. Export information for connection
    console.log('📋 CONNECTION DATA:\n');
    console.log(`   EOA address:     ${eoaAddress}`);
    console.log(`   Proxy address:   ${PROXY_WALLET}`);
    console.log(
        `   Proxy type:      ${isContract ? 'Smart Contract (Gnosis Safe)' : 'EOA (simple address)'}\n`
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

analyzeWallets().catch(console.error);

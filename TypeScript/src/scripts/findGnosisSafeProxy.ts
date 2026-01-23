import { ethers } from 'ethers';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PRIVATE_KEY = ENV.PRIVATE_KEY;
const RPC_URL = ENV.RPC_URL;

// Gnosis Safe Proxy Factory адрес на Polygon
const GNOSIS_SAFE_PROXY_FACTORY = '0xaacfeea03eb1561c4e67d661e40682bd20e3541b';

async function findGnosisSafeProxy() {
    console.log('\n🔍 ПОИСК GNOSIS SAFE PROXY WALLET\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Получаем EOA адрес из приватного ключа
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const eoaAddress = wallet.address;

    console.log('📋 ШАГ 1: Ваш EOA адрес (из приватного ключа)\n');
    console.log(`   ${eoaAddress}\n`);

    // 2. Ищем все позиции на EOA
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 ШАГ 2: Позиции на EOA адресе\n');

    try {
        const eoaPositions: any[] = await fetchData(
            `https://data-api.polymarket.com/positions?user=${eoaAddress}`
        );
        console.log(`   Позиций: ${eoaPositions?.length || 0}\n`);

        if (eoaPositions && eoaPositions.length > 0) {
            console.log('   ✅ Есть позиции на EOA!\n');
        }
    } catch (error) {
        console.log('   ❌ Не удалось получить позиции\n');
    }

    // 3. Ищем транзакции EOA чтобы найти proxy
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 ШАГ 3: Ищем Gnosis Safe Proxy через транзакции\n');

    try {
        const activities: any[] = await fetchData(
            `https://data-api.polymarket.com/activity?user=${eoaAddress}&type=TRADE`
        );

        if (activities && activities.length > 0) {
            const firstTrade = activities[0];
            const proxyWalletFromTrade = firstTrade.proxyWallet;

            console.log(`   EOA адрес:          ${eoaAddress}`);
            console.log(`   Proxy в сделках:    ${proxyWalletFromTrade}\n`);

            if (proxyWalletFromTrade.toLowerCase() !== eoaAddress.toLowerCase()) {
                console.log('   🎯 НАЙДЕН GNOSIS SAFE PROXY!\n');
                console.log(`   Proxy адрес: ${proxyWalletFromTrade}\n`);

                // Проверяем позиции на proxy
                const proxyPositions: any[] = await fetchData(
                    `https://data-api.polymarket.com/positions?user=${proxyWalletFromTrade}`
                );

                console.log(`   Позиций на Proxy: ${proxyPositions?.length || 0}\n`);

                if (proxyPositions && proxyPositions.length > 0) {
                    console.log('   ✅ ВОТ ГДЕ ВАШИ ПОЗИЦИИ!\n');

                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    console.log('🔧 РЕШЕНИЕ:\n');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                    console.log('Обновите .env файл:\n');
                    console.log(`PROXY_WALLET=${proxyWalletFromTrade}\n`);

                    console.log('Тогда бот будет использовать правильный Gnosis Safe proxy\n');
                    console.log('и позиции будут совпадать с фронтендом!\n');

                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    console.log('📊 ТЕКУЩЕЕ СОСТОЯНИЕ:\n');
                    console.log(`   Бот использует:    ${ENV.PROXY_WALLET}`);
                    console.log(`   Должен использовать: ${proxyWalletFromTrade}\n`);

                    if (ENV.PROXY_WALLET.toLowerCase() === proxyWalletFromTrade.toLowerCase()) {
                        console.log('   ✅ Адреса совпадают! Всё правильно настроено.\n');
                    } else {
                        console.log('   ❌ АДРЕСА НЕ СОВПАДАЮТ!\n');
                        console.log('   Поэтому вы видите разные позиции на боте и фронтенде.\n');
                    }
                }
            } else {
                console.log('   ℹ️  Proxy совпадает с EOA (торгуете напрямую через EOA)\n');
            }
        } else {
            console.log('   ❌ Нет транзакций на этом адресе\n');
        }
    } catch (error) {
        console.log('   ❌ Ошибка при поиске транзакций\n');
    }

    // 4. Дополнительный поиск через Polygon blockchain
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 ШАГ 4: Поиск через Polygon blockchain\n');

    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

        // Ищем события ProxyCreation от Gnosis Safe Factory
        console.log('   Проверяем создание Gnosis Safe...\n');

        // ABI события ProxyCreation
        const eventAbi = ['event ProxyCreation(address indexed proxy, address singleton)'];
        const iface = new ethers.utils.Interface(eventAbi);
        const eventTopic = iface.getEventTopic('ProxyCreation');

        // Ищем события где owner это наш EOA
        // Обычно Gnosis Safe создается при первой транзакции
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 10000000); // Последние ~10M блоков

        console.log(`   Сканирую блоки с ${fromBlock} по ${latestBlock}...\n`);
        console.log('   ⏳ Это может занять некоторое время...\n');

        // Проверяем транзакции EOA
        const txCount = await provider.getTransactionCount(eoaAddress);
        console.log(`   Транзакций с EOA: ${txCount}\n`);

        if (txCount > 0) {
            console.log('   ℹ️  EOA делал транзакции. Возможно есть Gnosis Safe.\n');
        }
    } catch (error) {
        console.log('   ⚠️  Не удалось проверить blockchain напрямую\n');
    }

    // 5. Итоговые рекомендации
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 РЕКОМЕНДАЦИИ:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Зайдите на polymarket.com через браузер\n');
    console.log('2. Подключите кошелек с тем же приватным ключом\n');
    console.log('3. Скопируйте адрес который показывает Polymarket\n');
    console.log('4. Обновите PROXY_WALLET в .env этим адресом\n');
    console.log('5. Перезапустите бота\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📍 КАК НАЙТИ PROXY АДРЕС НА ФРОНТЕНДЕ:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('На Polymarket после подключения:\n');
    console.log('1. Кликните на иконку профиля (правый верхний угол)\n');
    console.log('2. Там будет адрес вида 0x...\n');
    console.log('3. Это и есть ваш Proxy Wallet адрес!\n');
    console.log('4. Скопируйте его в PROXY_WALLET в .env\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔗 Полезные ссылки:\n');
    console.log(`   EOA профиль:     https://polymarket.com/profile/${eoaAddress}`);
    console.log(`   EOA Polygonscan: https://polygonscan.com/address/${eoaAddress}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

findGnosisSafeProxy().catch(console.error);

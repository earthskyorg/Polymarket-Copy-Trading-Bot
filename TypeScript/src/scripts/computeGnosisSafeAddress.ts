import { ethers } from 'ethers';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PRIVATE_KEY = ENV.PRIVATE_KEY;
const RPC_URL = ENV.RPC_URL;

// Gnosis Safe Proxy Factory на Polygon
const GNOSIS_SAFE_PROXY_FACTORY = '0xaacfeea03eb1561c4e67d661e40682bd20e3541b';
const POLYMARKET_PROXY_FACTORY = '0xab45c5a4b0c941a2f231c04c3f49182e1a254052';

async function computeGnosisSafeAddress() {
    console.log('\n🔍 ВЫЧИСЛЕНИЕ GNOSIS SAFE PROXY АДРЕСА\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const eoaAddress = wallet.address;

    console.log('📋 EOA адрес (из приватного ключа):\n');
    console.log(`   ${eoaAddress}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Поиск Gnosis Safe Proxy через события\n');

    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

        // ABI для ProxyCreation события
        const proxyFactoryAbi = ['event ProxyCreation(address indexed proxy, address singleton)'];

        const gnosisSafeFactory = new ethers.Contract(
            GNOSIS_SAFE_PROXY_FACTORY,
            proxyFactoryAbi,
            provider
        );

        const polymarketProxyFactory = new ethers.Contract(
            POLYMARKET_PROXY_FACTORY,
            proxyFactoryAbi,
            provider
        );

        console.log('   Ищу ProxyCreation события...\n');

        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 10000000); // Последние 10M блоков

        console.log(`   Блоки: ${fromBlock} - ${latestBlock}\n`);
        console.log('   ⏳ Поиск может занять время...\n');

        // Ищем ProxyCreation события для обеих фабрик
        const factories = [
            {
                name: 'Gnosis Safe Factory',
                contract: gnosisSafeFactory,
                address: GNOSIS_SAFE_PROXY_FACTORY,
            },
            {
                name: 'Polymarket Proxy Factory',
                contract: polymarketProxyFactory,
                address: POLYMARKET_PROXY_FACTORY,
            },
        ];

        for (const factory of factories) {
            console.log(`   Проверяю ${factory.name}...\n`);

            try {
                const filter = factory.contract.filters.ProxyCreation();
                const events = await factory.contract.queryFilter(filter, fromBlock, latestBlock);

                console.log(`   Найдено событий: ${events.length}\n`);

                // Проверяем каждый созданный proxy
                for (const event of events) {
                    if (event.args && event.args.proxy) {
                        const proxyAddress = event.args.proxy;

                        // Проверяем владеет ли наш EOA этим proxy
                        // Для Gnosis Safe смотрим на владельцев
                        try {
                            const gnosisSafeAbi = ['function getOwners() view returns (address[])'];

                            const safeContract = new ethers.Contract(
                                proxyAddress,
                                gnosisSafeAbi,
                                provider
                            );
                            const owners = await safeContract.getOwners();

                            if (owners && owners.length > 0) {
                                const isOwner = owners.some(
                                    (owner: string) =>
                                        owner.toLowerCase() === eoaAddress.toLowerCase()
                                );

                                if (isOwner) {
                                    console.log(`   🎯 НАЙДЕН GNOSIS SAFE!\n`);
                                    console.log(`   Proxy адрес: ${proxyAddress}\n`);

                                    // Проверяем позиции
                                    const positions: any[] = await fetchData(
                                        `https://data-api.polymarket.com/positions?user=${proxyAddress}`
                                    );

                                    console.log(`   Позиций на Proxy: ${positions?.length || 0}\n`);

                                    if (positions && positions.length > 0) {
                                        console.log(
                                            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                                        );
                                        console.log('✅ РЕШЕНИЕ НАЙДЕНО!\n');
                                        console.log(
                                            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                                        );
                                        console.log(`Обновите .env файл:\n`);
                                        console.log(`PROXY_WALLET=${proxyAddress}\n`);
                                        console.log(
                                            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                                        );
                                        return proxyAddress;
                                    }
                                }
                            }
                        } catch (e) {
                            // Не Gnosis Safe или ошибка, пропускаем
                        }
                    }
                }
            } catch (e) {
                console.log(`   ⚠️  Ошибка при проверке ${factory.name}\n`);
            }
        }

        console.log('   ❌ Gnosis Safe Proxy не найден через события\n');
    } catch (error) {
        console.log('   ⚠️  Ошибка при поиске через blockchain\n');
    }

    // Альтернативный метод - проверяем конкретный адрес
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Проверка известного адреса 0xd62531...\n');

    const suspectAddress = '0xd62531bc536bff72394fc5ef715525575787e809';

    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

        // Проверяем является ли это смарт-контрактом
        const code = await provider.getCode(suspectAddress);
        const isContract = code !== '0x';

        console.log(`   Адрес: ${suspectAddress}`);
        console.log(`   Тип: ${isContract ? 'Smart Contract' : 'EOA'}\n`);

        if (isContract) {
            // Проверяем владельцев Gnosis Safe
            try {
                const gnosisSafeAbi = [
                    'function getOwners() view returns (address[])',
                    'function getThreshold() view returns (uint256)',
                ];

                const safeContract = new ethers.Contract(suspectAddress, gnosisSafeAbi, provider);
                const owners = await safeContract.getOwners();
                const threshold = await safeContract.getThreshold();

                console.log(`   Это Gnosis Safe!`);
                console.log(`   Владельцев: ${owners.length}`);
                console.log(`   Threshold: ${threshold}\n`);

                for (let i = 0; i < owners.length; i++) {
                    console.log(`   Owner ${i + 1}: ${owners[i]}`);
                    if (owners[i].toLowerCase() === eoaAddress.toLowerCase()) {
                        console.log(`   ✅ ЭТО ВАШ GNOSIS SAFE!\n`);
                    }
                }

                // Проверяем позиции
                const positions: any[] = await fetchData(
                    `https://data-api.polymarket.com/positions?user=${suspectAddress}`
                );

                console.log(`\n   Позиций на этом адресе: ${positions?.length || 0}\n`);

                if (positions && positions.length > 0) {
                    console.log('   🎯 ПОЗИЦИИ НАЙДЕНЫ НА ЭТОМ АДРЕСЕ!\n');
                }
            } catch (e) {
                console.log('   ⚠️  Не Gnosis Safe или ошибка доступа\n');
            }
        }
    } catch (error) {
        console.log('   ⚠️  Ошибка при проверке ��дреса\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 ИТОГ:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('У вас есть 2 адреса:\n');
    console.log(`1. EOA:   ${eoaAddress}`);
    console.log(`   - Позиций: 20`);
    console.log(`   - Бот торгует ЗДЕСЬ\n`);

    console.log(`2. Proxy: ${suspectAddress}`);
    console.log(`   - Позиций: 0`);
    console.log(`   - Фронтенд показывает ЭТОТ адрес\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 ПОЧЕМУ ТАК ПРОИСХОДИТ:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Polymarket создает Gnosis Safe proxy при первом входе.\n');
    console.log('Но ваш бот настроен использовать EOA напрямую.\n');
    console.log('Поэтому:\n');
    console.log('- Бот торгует через EOA (0x4fbBe...)\n');
    console.log('- Фронтенд показывает Gnosis Safe (0xd6253...)\n');
    console.log('- Это РАЗНЫЕ кошельки!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ РЕШЕНИЕ:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('ВАРИАНТ 1: Использовать EOA адрес на фронтенде\n');
    console.log(`  Откройте: https://polymarket.com/profile/${eoaAddress}\n`);
    console.log('  Здесь увидите все 20 позиций бота.\n');

    console.log('ВАРИАНТ 2: Настроить бота на Gnosis Safe\n');
    console.log('  Обновите код бота чтобы использовать SignatureType.POLY_GNOSIS_SAFE\n');
    console.log(`  и PROXY_WALLET=${suspectAddress}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

computeGnosisSafeAddress().catch(console.error);

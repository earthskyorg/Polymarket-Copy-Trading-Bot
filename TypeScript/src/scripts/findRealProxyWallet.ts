import { ethers } from 'ethers';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PRIVATE_KEY = ENV.PRIVATE_KEY;
const RPC_URL = ENV.RPC_URL;

async function findRealProxyWallet() {
    console.log('\n🔍 ПОИСК НАСТОЯЩЕГО PROXY WALLET\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const eoaAddress = wallet.address;

    console.log('📋 EOA адрес (из приватного ключа):\n');
    console.log(`   ${eoaAddress}\n`);

    // 1. Проверяем username API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 ШАГ 1: Проверка username через API\n');

    try {
        // Пробуем получить профиль пользователя
        const userProfile = await fetchData(`https://data-api.polymarket.com/users/${eoaAddress}`);

        console.log('   Данные профиля:', JSON.stringify(userProfile, null, 2), '\n');
    } catch (error) {
        console.log('   ⚠️  Не удалось получить профиль через /users\n');
    }

    // 2. Проверяем все транзакции на blockchain
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 ШАГ 2: Анализ транзакций на Polygon\n');

    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

        // Получаем последние транзакции
        console.log('   Получаю историю транзакций...\n');

        // Используем Polygonscan API
        const polygonscanApiKey = 'YourApiKeyToken'; // Free tier
        const polygonscanUrl = `https://api.polygonscan.com/api?module=account&action=txlist&address=${eoaAddress}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${polygonscanApiKey}`;

        try {
            const response = await fetch(polygonscanUrl);
            const data = await response.json();

            if (data.status === '1' && data.result && data.result.length > 0) {
                console.log(`   ✅ Найдено транзакций: ${data.result.length}\n`);

                // Ищем взаимодействия с Gnosis Safe Factory или Proxy
                const gnosisSafeFactories = [
                    '0xaacfeea03eb1561c4e67d661e40682bd20e3541b', // Gnosis Safe Proxy Factory
                    '0xab45c5a4b0c941a2f231c04c3f49182e1a254052', // Polymarket Proxy Factory
                ];

                const relevantTxs = data.result.filter((tx: any) =>
                    gnosisSafeFactories.some(
                        (factory) => tx.to?.toLowerCase() === factory.toLowerCase()
                    )
                );

                if (relevantTxs.length > 0) {
                    console.log('   🎯 Найдены транзакции с Proxy Factory:\n');

                    for (const tx of relevantTxs.slice(0, 3)) {
                        console.log(`      TX: ${tx.hash}`);
                        console.log(`      To: ${tx.to}`);
                        console.log(`      Block: ${tx.blockNumber}\n`);

                        // Получаем receipt чтобы найти созданный контракт
                        try {
                            const receipt = await provider.getTransactionReceipt(tx.hash);

                            if (receipt && receipt.logs && receipt.logs.length > 0) {
                                console.log(`      📝 Logs в транзакции:\n`);

                                // Ищем события создания proxy
                                for (const log of receipt.logs) {
                                    console.log(`         Contract: ${log.address}`);

                                    // Проверяем является ли это адресом контракта
                                    const code = await provider.getCode(log.address);
                                    if (code !== '0x') {
                                        console.log(`         ✅ Это смарт-контракт!\n`);

                                        // Проверяем есть ли позиции на этом адресе
                                        const positions: any[] = await fetchData(
                                            `https://data-api.polymarket.com/positions?user=${log.address}`
                                        );

                                        if (positions && positions.length > 0) {
                                            console.log(`         🎉 НАЙДЕН PROXY С ПОЗИЦИЯМИ!\n`);
                                            console.log(`         Proxy адрес: ${log.address}`);
                                            console.log(`         Позиций: ${positions.length}\n`);

                                            console.log(
                                                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                                            );
                                            console.log('✅ РЕШЕНИЕ НАЙДЕНО!\n');
                                            console.log(
                                                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                                            );
                                            console.log(`Обновите .env файл:\n`);
                                            console.log(`PROXY_WALLET=${log.address}\n`);
                                            return;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.log(`      ⚠️  Не удалось получить receipt\n`);
                        }
                    }
                } else {
                    console.log('   ❌ Нет транзакций с Proxy Factory\n');
                }
            }
        } catch (e) {
            console.log('   ⚠️  Polygonscan API недоступен (нужен API key)\n');
        }
    } catch (error) {
        console.log('   ⚠️  Ошибка при анализе транзакций\n');
    }

    // 3. Проверяем через баланс токенов
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 ШАГ 3: Поиск через balance API\n');

    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

        // USDC контракт на Polygon
        const USDC_ADDRESS = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
        const usdcAbi = [
            'function balanceOf(address owner) view returns (uint256)',
            'event Transfer(address indexed from, address indexed to, uint256 value)',
        ];

        const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);

        // Проверяем баланс на EOA
        const balance = await usdcContract.balanceOf(eoaAddress);
        console.log(`   USDC на EOA: ${ethers.utils.formatUnits(balance, 6)}\n`);

        // Ищем Transfer события связанные с нашим EOA
        console.log('   Ищу USDC transfers...\n');

        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 1000000); // Последние ~1M блоков

        const transferFilter = usdcContract.filters.Transfer(eoaAddress, null);
        const events = await usdcContract.queryFilter(transferFilter, fromBlock, latestBlock);

        if (events.length > 0) {
            console.log(`   ✅ Найдено USDC transfers: ${events.length}\n`);

            // Собираем уникальные адреса получателей
            const recipients = new Set<string>();
            for (const event of events) {
                if (event.args && event.args.to) {
                    recipients.add(event.args.to.toLowerCase());
                }
            }

            console.log('   Проверяю получателей на н��личие позиций...\n');

            for (const recipient of Array.from(recipients).slice(0, 5)) {
                const positions: any[] = await fetchData(
                    `https://data-api.polymarket.com/positions?user=${recipient}`
                );

                if (positions && positions.length > 0) {
                    console.log(`   🎯 Адрес с позициями: ${recipient}`);
                    console.log(`   Позиций: ${positions.length}\n`);
                }
            }
        }
    } catch (error) {
        console.log('   ⚠️  Не удалось проверить USDC transfers\n');
    }

    // 4. Финальные инструкции
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 РУЧНОЙ СПОСОБ (100% работает):\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Откройте polymarket.com\n');
    console.log('2. Импортируйте приватный ключ в MetaMask:\n');
    console.log(`   ${PRIVATE_KEY.slice(0, 10)}...${PRIVATE_KEY.slice(-6)}\n`);
    console.log('3. Подключитесь к Polymarket\n');
    console.log('4. Откройте консоль браузера (F12)\n');
    console.log('5. Выполните:\n');
    console.log('   localStorage\n');
    console.log('   или\n');
    console.log('   window.ethereum.selectedAddress\n');
    console.log('6. Скопируйте адрес который там увидите\n');
    console.log('7. Пришлите мне этот адрес\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 ИЛИ проверьте в браузере:\n');
    console.log('   1. Зайдите на polymarket.com\n');
    console.log('   2. Подключите кошелек\n');
    console.log('   3. Кликните на иконку профиля\n');
    console.log('   4. Скопируйте адрес который там написан\n');
    console.log('   5. Это и есть ваш настоящий Proxy адрес!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

findRealProxyWallet().catch(console.error);

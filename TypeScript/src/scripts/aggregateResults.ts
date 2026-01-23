import * as fs from 'fs';
import * as path from 'path';

// Colors
const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
};

interface TraderResult {
    address: string;
    roi: number;
    totalPnl: number;
    winRate: number;
    copiedTrades: number;
    status?: string;
}

interface ScanResult {
    scanDate: string;
    config: {
        historyDays: number;
        multiplier: number;
        minOrderSize: number;
        startingCapital: number;
    };
    summary?: {
        totalAnalyzed: number;
        profitable: number;
        avgROI: number;
        avgWinRate: number;
    };
    traders: TraderResult[];
}

interface AnalysisResult {
    timestamp: number;
    traderAddress: string;
    config: {
        historyDays: number;
        multiplier: number;
        minOrderSize: number;
        startingCapital: number;
    };
    results: {
        address: string;
        roi: number;
        totalPnl: number;
        winRate: number;
        copiedTrades: number;
    }[];
}

interface StrategyPerformance {
    strategyId: string;
    historyDays: number;
    multiplier: number;
    bestROI: number;
    bestWinRate: number;
    bestPnL: number;
    avgROI: number;
    avgWinRate: number;
    tradersAnalyzed: number;
    profitableTraders: number;
    filesCount: number;
}

async function aggregateResults() {
    console.log(
        colors.cyan('\n╔════════════════════════════════════════════════════════════════╗')
    );
    console.log(colors.cyan('║          📊 AGGREGATOR OF ALL STRATEGY RESULTS               ║'));
    console.log(
        colors.cyan('╚════════════════════════════════════════════════════════════════╝\n')
    );

    const dirs = [
        'trader_scan_results',
        'trader_analysis_results',
        'top_traders_results',
        'strategy_factory_results',
    ];

    const allStrategies = new Map<string, StrategyPerformance>();
    const allTraders = new Map<
        string,
        { bestROI: number; bestStrategy: string; timesFound: number }
    >();

    let totalFiles = 0;

    // Сканируем все директории
    for (const dir of dirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
        console.log(colors.gray(`📁 Scanning ${dir}/: found ${files.length} files`));

        for (const file of files) {
            totalFiles++;
            const filePath = path.join(dirPath, file);

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content) as ScanResult | AnalysisResult | any;

                // Определяем тип файла и извлекаем данные
                let config: any;
                let traders: any[] = [];

                if (data.traders && Array.isArray(data.traders)) {
                    // Формат scan results
                    config = data.config;
                    traders = data.traders;
                } else if (data.results && Array.isArray(data.results)) {
                    // Формат analysis results
                    config = data.config;
                    traders = data.results;
                } else {
                    continue;
                }

                if (!config || !config.historyDays) continue;

                const strategyId = `${config.historyDays}d_${config.multiplier || 1.0}x`;

                // Инициализация стратегии если её нет
                if (!allStrategies.has(strategyId)) {
                    allStrategies.set(strategyId, {
                        strategyId,
                        historyDays: config.historyDays,
                        multiplier: config.multiplier || 1.0,
                        bestROI: -Infinity,
                        bestWinRate: 0,
                        bestPnL: -Infinity,
                        avgROI: 0,
                        avgWinRate: 0,
                        tradersAnalyzed: 0,
                        profitableTraders: 0,
                        filesCount: 0,
                    });
                }

                const strategy = allStrategies.get(strategyId)!;
                strategy.filesCount++;

                let totalROI = 0;
                let totalWinRate = 0;
                let tradersCount = 0;

                // Анализ трейдеров
                for (const trader of traders) {
                    if (!trader.roi && trader.roi !== 0) continue;

                    tradersCount++;
                    totalROI += trader.roi;
                    totalWinRate += trader.winRate || 0;

                    if (trader.roi > strategy.bestROI) {
                        strategy.bestROI = trader.roi;
                    }
                    if ((trader.winRate || 0) > strategy.bestWinRate) {
                        strategy.bestWinRate = trader.winRate;
                    }
                    if ((trader.totalPnl || 0) > strategy.bestPnL) {
                        strategy.bestPnL = trader.totalPnl;
                    }
                    if (trader.roi > 0) {
                        strategy.profitableTraders++;
                    }

                    // Трекинг трейдеров
                    if (trader.address) {
                        if (!allTraders.has(trader.address)) {
                            allTraders.set(trader.address, {
                                bestROI: trader.roi,
                                bestStrategy: strategyId,
                                timesFound: 1,
                            });
                        } else {
                            const t = allTraders.get(trader.address)!;
                            t.timesFound++;
                            if (trader.roi > t.bestROI) {
                                t.bestROI = trader.roi;
                                t.bestStrategy = strategyId;
                            }
                        }
                    }
                }

                strategy.tradersAnalyzed += tradersCount;
                if (tradersCount > 0) {
                    strategy.avgROI = totalROI / tradersCount;
                    strategy.avgWinRate = totalWinRate / tradersCount;
                }
            } catch (error) {
                // Игнорируем ошибки парсинга
            }
        }
    }

    console.log(colors.green(`✓ Processed ${totalFiles} files\n`));

    // Сортировка стратегий
    const strategies = Array.from(allStrategies.values()).sort((a, b) => b.bestROI - a.bestROI);

    // Output results
    console.log(colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  🏆 TOP STRATEGIES BY BEST ROI'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    console.log(
        colors.bold(
            '  #  | Strategy      | Best ROI  | Best Win% | Best P&L   | Avg ROI   | Profitable | Files'
        )
    );
    console.log(colors.gray('─'.repeat(100)));

    strategies.slice(0, 15).forEach((s, i) => {
        const roiColor = s.bestROI >= 0 ? colors.green : colors.red;
        const roiSign = s.bestROI >= 0 ? '+' : '';
        const pnlSign = s.bestPnL >= 0 ? '+' : '';

        console.log(
            `  ${colors.yellow((i + 1).toString().padEnd(2))} | ` +
                `${colors.blue(s.strategyId.padEnd(13))} | ` +
                `${roiColor((roiSign + s.bestROI.toFixed(1) + '%').padEnd(9))} | ` +
                `${colors.yellow(s.bestWinRate.toFixed(1) + '%').padEnd(9)} | ` +
                `${pnlSign}$${s.bestPnL.toFixed(0).padEnd(9)} | ` +
                `${s.avgROI.toFixed(1) + '%'}.padEnd(9) | ` +
                `${s.profitableTraders}/${s.tradersAnalyzed}`.padEnd(10) +
                ' | ' +
                `${s.filesCount}`
        );
    });

    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  🎯 TOP TRADERS (found in multiple scans)'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    const topTraders = Array.from(allTraders.entries())
        .sort(([, a], [, b]) => b.bestROI - a.bestROI)
        .slice(0, 10);

    console.log(
        colors.bold(
            '  #  | Address                                    | Best ROI  | Best Strategy | Found times'
        )
    );
    console.log(colors.gray('─'.repeat(100)));

    topTraders.forEach(([address, data], i) => {
        const roiColor = data.bestROI >= 0 ? colors.green : colors.red;
        const roiSign = data.bestROI >= 0 ? '+' : '';

        console.log(
            `  ${colors.yellow((i + 1).toString().padEnd(2))} | ` +
                `${colors.blue(address.padEnd(42))} | ` +
                `${roiColor((roiSign + data.bestROI.toFixed(1) + '%').padEnd(9))} | ` +
                `${colors.cyan(data.bestStrategy.padEnd(13))} | ` +
                `${data.timesFound}`
        );
    });

    // Statistics
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  📈 OVERALL STATISTICS'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    const totalTraders = Array.from(allStrategies.values()).reduce(
        (sum, s) => sum + s.tradersAnalyzed,
        0
    );
    const totalProfitable = Array.from(allStrategies.values()).reduce(
        (sum, s) => sum + s.profitableTraders,
        0
    );
    const uniqueTraders = allTraders.size;
    const profitableRate = totalTraders > 0 ? (totalProfitable / totalTraders) * 100 : 0;

    console.log(`  Total files:            ${colors.cyan(totalFiles.toString())}`);
    console.log(`  Total strategies:       ${colors.cyan(strategies.length.toString())}`);
    console.log(`  Total traders:          ${colors.cyan(totalTraders.toString())}`);
    console.log(`  Unique traders:         ${colors.cyan(uniqueTraders.toString())}`);
    console.log(
        `  Profitable traders:     ${colors.green(totalProfitable.toString())} (${profitableRate.toFixed(1)}%)`
    );

    // Best strategy
    if (strategies.length > 0) {
        const best = strategies[0];
        console.log('\n' + colors.green('🌟 BEST STRATEGY:'));
        console.log(`  ID: ${colors.yellow(best.strategyId)}`);
        console.log(`  ROI: ${colors.green('+' + best.bestROI.toFixed(2) + '%')}`);
        console.log(`  Win Rate: ${colors.yellow(best.bestWinRate.toFixed(1) + '%')}`);
        console.log(`  P&L: ${colors.green('+$' + best.bestPnL.toFixed(2))}`);
    }

    // Сохранение агрегированных результатов
    const outputPath = path.join(
        process.cwd(),
        'strategy_factory_results',
        'aggregated_results.json'
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const output = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles,
            totalStrategies: strategies.length,
            totalTraders,
            uniqueTraders,
            profitableTraders: totalProfitable,
            profitableRate,
        },
        strategies: strategies.slice(0, 20),
        topTraders: topTraders.map(([address, data]) => ({ address, ...data })),
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(
        `\n${colors.green('✓ Aggregated results saved:')} ${colors.cyan(outputPath)}\n`
    );
}

aggregateResults().catch((error) => {
    console.error(colors.red('✗ Error:'), error);
    process.exit(1);
});

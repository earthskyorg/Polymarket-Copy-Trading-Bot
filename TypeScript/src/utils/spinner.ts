import ora from 'ora';

const spinner = ora({
    spinner: {
        interval: 200,
        frames: [
            '▰▱▱▱▱▱▱',
            '▰▰▱▱▱▱▱',
            '▰▰▰▱▱▱▱',
            '▰▰▰▰▱▱▱',
            '▰▰▰▰▰▱▱',
            '▰▰▰▰▰▰▱',
            '▰▰▰▰▰▰▰',
            '▱▱▱▱▱▱▱',
        ],
    },
});

export default spinner;

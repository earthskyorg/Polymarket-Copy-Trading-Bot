# Contributing to Polymarket Copy Trading Bot

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

- Be respectful and considerate of others
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/polymarket-copy-trading-bot.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`

## Development Workflow

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- TypeScript knowledge
- Understanding of blockchain/trading concepts

### Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Add JSDoc comments for public functions
- Use meaningful variable and function names
- Keep functions focused and small

### Linting and Formatting

Before committing, ensure your code passes:

```bash
# Check linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format

# Type check
npx tsc --noEmit
```

### Testing

- Write tests for new features
- Ensure all existing tests pass: `npm test`
- Aim for good test coverage

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add new trade aggregation feature
fix: Resolve balance calculation issue
docs: Update README with new configuration options
refactor: Improve error handling in trade executor
test: Add tests for copy strategy calculation
```

## Pull Request Process

1. **Update Documentation**: If you're adding features, update relevant documentation
2. **Add Tests**: Include tests for new functionality
3. **Ensure CI Passes**: All CI checks must pass
4. **Update CHANGELOG**: Document your changes (if applicable)
5. **Create PR**: Open a pull request with a clear description

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings or errors
- [ ] TypeScript compiles without errors

## Areas for Contribution

### High Priority

- Bug fixes
- Performance improvements
- Security enhancements
- Documentation improvements

### Feature Ideas

- Additional copy trading strategies
- Better error recovery mechanisms
- Enhanced monitoring and alerting
- UI/CLI improvements

## Reporting Issues

When reporting bugs, please include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Node.js version, OS, etc.
- **Logs**: Relevant error logs (sanitize sensitive data)

## Security Issues

**Do not** open public issues for security vulnerabilities. Instead, contact the maintainer directly.

## Questions?

Feel free to open a discussion or contact the maintainer for questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the ISC License.


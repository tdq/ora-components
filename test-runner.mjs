import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;
const packagePath = path.join(projectRoot, 'packages', 'ora-components');

console.log('Running tests for number-column...');
try {
  execSync('npm test -- --testPathPattern=number-column', { cwd: packagePath, stdio: 'inherit' });
  console.log('✓ number-column tests passed');
} catch (e) {
  console.error('✗ number-column tests failed');
  process.exit(1);
}

console.log('Running tests for number-field...');
try {
  execSync('npm test -- --testPathPattern=number-field', { cwd: packagePath, stdio: 'inherit' });
  console.log('✓ number-field tests passed');
} catch (e) {
  console.error('✗ number-field tests failed');
  process.exit(1);
}

console.log('Running tests for money-field...');
try {
  execSync('npm test -- --testPathPattern=money-field', { cwd: packagePath, stdio: 'inherit' });
  console.log('✓ money-field tests passed');
} catch (e) {
  console.error('✗ money-field tests failed');
  process.exit(1);
}

console.log('Running tests for money-column...');
try {
  execSync('npm test -- --testPathPattern=money-column', { cwd: packagePath, stdio: 'inherit' });
  console.log('✓ money-column tests passed');
} catch (e) {
  console.error('✗ money-column tests failed');
  process.exit(1);
}

console.log('All tests passed!');
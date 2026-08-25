import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function commitAndPush(repoRoot, filePath, message) {
  const relative = path.relative(repoRoot, filePath);
  const result = { committed: false, pushed: false, error: null };

  try {
    execFileSync('git', ['add', relative], { cwd: repoRoot, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', message], { cwd: repoRoot, stdio: 'pipe' });
    result.committed = true;
  } catch (err) {
    result.error = `commit failed: ${err.stderr?.toString() || err.message}`;
    return result;
  }

  try {
    execFileSync('git', ['push'], { cwd: repoRoot, stdio: 'pipe' });
    result.pushed = true;
  } catch (err) {
    result.error = `push failed: ${err.stderr?.toString() || err.message}`;
  }

  return result;
}

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../db/client.js', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('../middleware/visibility.js', () => ({
  getVisibilityContext: vi.fn().mockResolvedValue({ isAdmin: false }),
  VISIBILITY_FILTER_SQL: vi.fn().mockReturnValue('1=1'),
}));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.userId = 'user-123';
    req.workspaceId = 'ws-123';
    next();
  }),
}));

import { pool } from '../db/client.js';
import express from 'express';
import request from 'supertest';
import issuesRouter from './issues.js';

const row = {
  id: 'issue-1',
  title: 'Fix login',
  properties: { state: 'todo', priority: 'high' },
  ticket_number: 7,
  program_id: 'prog-1',
  sprint_id: null,
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  created_by: 'user-123',
};

describe('GET /api/issues', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use('/api/issues', issuesRouter);
  });

  it('includes content by default', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [row] } as any);

    const res = await request(app).get('/api/issues');

    expect(res.status).toBe(200);
    expect(res.body[0].content).toEqual(row.content);
    expect(res.body[0].display_id).toBe('#7');
    expect(vi.mocked(pool.query).mock.calls[0]![0]).toContain('d.content');
  });

  it('omits content from the query and response with include_content=false', async () => {
    const { content: _content, ...rowWithoutContent } = row;
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [rowWithoutContent] } as any);

    const res = await request(app).get('/api/issues?include_content=false');

    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty('content');
    expect(res.body[0].title).toBe('Fix login');
    expect(res.body[0].display_id).toBe('#7');
    expect(vi.mocked(pool.query).mock.calls[0]![0]).not.toContain('d.content');
  });
});

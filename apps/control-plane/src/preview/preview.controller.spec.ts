import { PreviewController } from './preview.controller';

describe('PreviewController', () => {
  it('rejects preview access while the workspace is stopped', async () => {
    const projectsService = { getForOwner: jest.fn().mockResolvedValue({ id: 'project-1', status: 'Stopped', workspaceId: 'local-project-1' }) };
    const workspaceService = { listRequests: jest.fn() };
    const controller = new PreviewController(projectsService as never, workspaceService as never);

    await expect(controller.list({ sub: 'user-1' }, 'project-1')).rejects.toMatchObject({ status: 409 });
    expect(workspaceService.listRequests).not.toHaveBeenCalled();
  });
});

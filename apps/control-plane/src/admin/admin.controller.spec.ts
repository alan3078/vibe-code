import { AdminController } from './admin.controller';
import { ProjectStatus } from '../entities/project.entity';

describe('AdminController', () => {
  it('passes three basic and advanced search fields to the workspace CMS list', () => {
    const service = { listProjectPage: jest.fn().mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 25 }) };
    const controller = new AdminController(service as never);
    const query = { name: 'tracker', owner: 'alex', status: ProjectStatus.Running, workspaceId: 'local-', createdFrom: '2026-08-01', page: 2, pageSize: 25 };

    void controller.projectPage(query);

    expect(service.listProjectPage).toHaveBeenCalledWith(query);
  });

  it('exposes user/role management and administrator project creation', () => {
    const service = {
      listRoles: jest.fn().mockResolvedValue([]),
      updateUserRole: jest.fn().mockResolvedValue({}),
      createProject: jest.fn().mockResolvedValue({}),
    };
    const controller = new AdminController(service as never);

    void controller.roles();
    void controller.updateUserRole({ sub: 'admin-1', role: 'Administrator' } as never, 'user-1', { role: 'Member' } as never, undefined);
    void controller.createProject({ sub: 'admin-1', role: 'Administrator' } as never, { ownerId: 'user-1', name: 'Created by admin' } as never, 'idem-1', undefined);

    expect(service.listRoles).toHaveBeenCalled();
    expect(service.updateUserRole).toHaveBeenCalledWith({ id: 'admin-1', role: 'Administrator' }, 'user-1', 'Member', null);
    expect(service.createProject).toHaveBeenCalledWith({ id: 'admin-1', role: 'Administrator' }, { ownerId: 'user-1', name: 'Created by admin' }, 'idem-1', null);
  });
});

const createEventMock = jest.fn();
const ensureCollectionMock = jest.fn();

jest.unstable_mockModule('../data-access/events.dao.js', () => ({
  createEvent: createEventMock
}));

jest.unstable_mockModule('../services/awsRekognition.js', () => ({
  ensureCollection: ensureCollectionMock
}));

describe('events.controller', () => {
  beforeEach(() => {
    createEventMock.mockReset();
    ensureCollectionMock.mockReset();
  });

  it('creates event and triggers collection creation', async () => {
    createEventMock.mockResolvedValue({
      id: 'event_1',
      name: 'Launch',
      startsAt: new Date('2026-03-01T10:00:00.000Z'),
      endsAt: new Date('2026-03-01T12:00:00.000Z')
    });
    ensureCollectionMock.mockResolvedValue(undefined);

    const { createEventController: controller } = await import('../controllers/events.controller.js');

    const result = await controller({
      name: 'Launch',
      startsAt: '2026-03-01T10:00:00.000Z',
      endsAt: '2026-03-01T12:00:00.000Z'
    });

    expect(createEventMock).toHaveBeenCalledTimes(1);
    expect(ensureCollectionMock).toHaveBeenCalledWith('event_1');
    expect(result.event.id).toBe('event_1');
  });
});

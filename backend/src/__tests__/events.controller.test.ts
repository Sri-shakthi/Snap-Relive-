import { createEventControllerFactory } from '../controllers/events.controller.js';

describe('events.controller', () => {
  it('creates event and triggers collection creation', async () => {
    const createEventFn = jest.fn().mockResolvedValue({
      id: 'event_1',
      name: 'Launch',
      eventType: 'CORPORATE',
      startsAt: new Date('2026-03-01T10:00:00.000Z'),
      endsAt: new Date('2026-03-01T12:00:00.000Z')
    });
    const ensureCollectionFn = jest.fn().mockResolvedValue(undefined);

    const controller = createEventControllerFactory({
      createEventFn,
      ensureCollectionFn
    });

    const result = await controller({
      name: 'Launch',
      eventType: 'CORPORATE',
      startsAt: '2026-03-01T10:00:00.000Z',
      endsAt: '2026-03-01T12:00:00.000Z'
    });

    expect(createEventFn).toHaveBeenCalledTimes(1);
    expect(createEventFn).toHaveBeenCalledWith({
      name: 'Launch',
      eventType: 'CORPORATE',
      startsAt: new Date('2026-03-01T10:00:00.000Z'),
      endsAt: new Date('2026-03-01T12:00:00.000Z')
    });
    expect(ensureCollectionFn).toHaveBeenCalledWith('event_1');
    expect(result.event.id).toBe('event_1');
  });
});

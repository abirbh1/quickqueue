"""Confirms the store is backed by a real, durable database rather than a
process-local Python object: a write made through one Session/Store must be
visible to a completely different Session/Store bound to the same engine.
"""

from quickqueue_backend.store import Store


def test_check_in_is_visible_from_a_separate_session(session_factory):
    session1 = session_factory()
    party, _, _ = Store(session1).check_in("Alvarez", None, 4)
    session1.close()

    session2 = session_factory()
    ids_in_queue = [p.id for p in Store(session2).get_queue()]
    session2.close()

    assert party.id in ids_in_queue


def test_reorder_persists_across_sessions(session_factory):
    session1 = session_factory()
    store1 = Store(session1)
    first, _, _ = store1.check_in("Alvarez", None, 2)
    second, _, _ = store1.check_in("Chen", None, 2)
    store1.move_up(second.id)
    session1.close()

    session2 = session_factory()
    names_in_order = [p.name for p in Store(session2).get_queue()]
    session2.close()

    assert names_in_order == ["Chen", "Alvarez"]


def test_turnover_history_persists_across_sessions(session_factory):
    session1 = session_factory()
    store1 = Store(session1)
    party, _, _ = store1.check_in("Alvarez", None, 2)
    store1.seat_party(party.id)
    store1.free_table(party.id)
    session1.close()

    session2 = session_factory()
    average = Store(session2).average_turnover_minutes()
    session2.close()

    assert average < 18  # a near-instant turnover pulled the rolling average down

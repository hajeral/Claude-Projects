import threading
import pytest
from app.wallet import Wallet, InsufficientFunds


def test_deposit_and_withdraw():
    w = Wallet(10)
    w.deposit(5)
    w.withdraw(15)
    assert w.balance == 0


def test_overdraw_rejected():
    with pytest.raises(InsufficientFunds):
        Wallet(1).withdraw(2)


@pytest.mark.parametrize("bad", [0, -1])
def test_non_positive_amounts(bad):
    with pytest.raises(ValueError):
        Wallet(1).deposit(bad)


def test_concurrent_withdraw_never_negative():
    w = Wallet(100)
    def drain():
        for _ in range(100):
            try:
                w.withdraw(1)
            except InsufficientFunds:
                pass
    ts = [threading.Thread(target=drain) for _ in range(8)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert w.balance == 0

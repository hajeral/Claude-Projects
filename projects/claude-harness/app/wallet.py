"""Tiny sample module so the harness has real code and tests on day one."""
import threading


class InsufficientFunds(Exception):
    pass


class Wallet:
    def __init__(self, balance: int = 0):
        if balance < 0:
            raise ValueError("balance cannot be negative")
        self._balance = balance
        self._lock = threading.Lock()

    @property
    def balance(self) -> int:
        return self._balance

    def deposit(self, amount: int) -> None:
        if amount <= 0:
            raise ValueError("amount must be positive")
        with self._lock:
            self._balance += amount

    def withdraw(self, amount: int) -> None:
        if amount <= 0:
            raise ValueError("amount must be positive")
        with self._lock:
            if amount > self._balance:
                raise InsufficientFunds(amount)
            self._balance -= amount

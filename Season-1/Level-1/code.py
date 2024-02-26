'''
Welcome to Secure Code Game Season-1/Level-1!

Follow the instructions below to get started:

1. tests.py is passing but code.py is vulnerable
2. Review the code. Can you spot the bug?
3. Fix the code but ensure that tests.py passes
4. Run hack.py and if passing then CONGRATS!
5. If stuck then read the hint
6. Compare your solution with solution.py
'''

from collections import namedtuple
from decimal import Decimal

Order = namedtuple('Order', 'id, items')
Item = namedtuple('Item', 'type, description, amount, quantity')

def my_validorder(order: Order):
    """
    hack.py : 2/3
    tests.py: oooxo
    """
    net = 0

    for item in order.items:
        if item.type == 'payment':
            # 1. hack.pyからpaymentにマイナス値があることを想定する必要
            #    => オーバーフローチェック時にはabs()を使う
            net += Decimal(item.amount)
        elif item.type == 'product':
            # 2. item.quantityがint型か確認する必要 (Decimal * floatが不可)
            # 3. 購入費の上限を設定して、適切にquantityとamountの上限を検査する必要 (Overflow対策)
            net -= Decimal(item.amount) * item.quantity
        else:
            return "Invalid item type: %s" % item.type

    # round()だと間違い。
    # netの値を最初からDecimal(str())の型でデータ保持・演算を行う
    # なお、この方法だと`1e+19`のような表現をされたときにunderflowの懸念
    # が残るので、item.amountの上限を検査する等の他の対策も必要
    if round(net) != 0:
        return "Order ID: %s - Payment imbalance: $%0.2f" % (order.id, net)
    else:
        return "Order ID: %s - Full payment received!" % order.id


MAX_TOTAL = 1_000_000
MAX_AMOUNT = 100_000
MAX_QUANTITY = 100
MIN_QUANTITY = 0

def validorder(order: Order):
    payments = Decimal('0.0')
    expenses = Decimal('0.0')

    for item in order.items:
        if item.type == 'payment':
            if -MAX_AMOUNT <= item.amount <= MAX_AMOUNT:
                payments += Decimal(str(item.amount))
        elif item.type == 'product':
            if type(item.quantity) is int and \
                    MIN_QUANTITY < item.quantity <= MAX_QUANTITY and \
                    MIN_QUANTITY < item.amount <= MAX_AMOUNT:
                expenses += Decimal(str(item.amount)) * item.quantity
        else:
            return "Invalid item type: %s" % item.type

    if abs(payments) > MAX_TOTAL or expenses > MAX_TOTAL:
        return "Total amount payable for an order exceeded"

    if payments != expenses:
        return "Order ID: %s - Payment imbalance: $%0.2f" % (order.id, payments - expenses)
    else:
        return "Order ID: %s - Full payment received!" % order.id

# secure-code-game

> This is my own README with a record of what I learned
>
> Original README is [here](./docs/README.md)

## Season-1

### 1. A floating-point underflow

>  浮動小数点アンダーフロー脆弱性

- float型を使う際は気をつけるべき点が増える
    - コンピュータの仕組み上、正確な少数を表現できないため
        ```python
        a = 1.1
        b = 2.2
        c = 3.3

        # 以下の演算はAssertionErrorとなる
        assert a + b == c
        ```
    - 大きい少数を用いると内部で近似が行われ、小さい少数が打ち消されてしまう
        ```python
        a = 1e19  # <- float
        b = 1000.00

        # 以下の演算はAssertionErrorとなる
        assert a + b == 10000000000000001000
        ```
- Pythonだと`decimal.Decimal`モジュールを使うと、正確な浮動小数点の計算が可能
    - `Decimal(str(***))`：代入する数値をstr型にするのが鉄則?
- また、プログラムの仕様に沿い／を定義し、適切な最大値と最小値の範囲検査を行うことが重要
    - 最大値、最小値はグローバル変数で定義する

### 2. Security through Obscurity Abuse / Buffer Overflow

- 隠蔽によるセキュリティでは、不十分なことが多く、他のセキュリティ対策と合わせて使用するべき
    - 問題では、攻撃者がバイナリからこれらの攻撃を可能とすることが伺える
- Buffer Overflowに関しては、やはり境界検査はしっかりやろうに帰着
    - 「最低値から最大値の間のあたいになっているか」
- gdbでバイナリ検査してわかったこと
    - strtol()は、char*型の数字をint型に変換する関数だが、マイナス値を入れるとバイナリ上で補数表現がされる
    - strtol()の演算結果をメモリのindex計算に用いると、マイナス値をうまく活用することで、想定外のメモリ番地へアクセス可能となる
        ```example
        EAX = 0x5500000

        // 本来なら`output_from_strtol = 0x2`等の自然数が望まれる
        // 以下は、strtol('-6')のケース
        output_from_strtol = 0xFFFFFFFFFFFA

        /*
        本来なら、せいぜい0x5500000 ~ 0x55000A 程度の範囲の値にアクセスすることを想定していても、
        補数表現で大きな値が入ると、x64環境で12桁しか保持されないので、
        演算結果が`0x1000005500000`となり、切り捨てで`0x000005500000`
        つまり、このstructの第一メンバへのアクセスを許してしまう
        */
        struct[EAX + output_from_strtol + 0x6] = 1
        ```

### 3. Directory Traversal

- 今までの考えだと、ディレクトリトラバーサルにはサニタイズで対処するのかと思っていた。が、入力されたパスを一回演算して、アクセス先が想定されたパス配下を指しているかを比較するという手段がある
    ```python
    import os

    # アクセスが想定されるパス
    base_dir = os.path.dirname(os.path.abspath(__file__))

    inputPath = input("ユーザ／攻撃者が入力したパス:")

    # ここで入力されたパスを一度演算する
    realPath = os.path.realpath(inputPath)

    # 入力されたパスとアクセスが想定されるパスが同じディレクトリ上を指しているか検査する
    # ディレクトリトラバーサルがある場合、realPathは別のディレクトリを指す
    assert base_dir == os.path.commonprefix([base_dir, realPath])
    ```

### 4. SQL Injection

- SQL Injection対策にはplacefolderを使用する
    ```python
    query = "SELECT price FROM stocks WHERE symbol = ?"
    cur.execute(query, (value,))
    ```
- セキュリティの観点では、動的なクエリ生成はよろしくないので、上記のようなプリペアドステートメントを使用するべき
    - ユーザからクエリを受取、そのまま`executescript()`や`execute()`に流すのは危険
        - クエリではなく、パラメータを受け取るというのが重要

### 5. Weak Hash and Password

- ハッシュ値における衝突攻撃の懸念があるため、MD5ではなく、SHA-256などの強力なハッシュ関数を使うべき
- パスワードハッシュの話
    - SHA-256は計算コスト(ビット長256bit, 64文字分)が高くないため、パスワードハッシュで使用すると解読される懸念？
    - パスワードハッシュのベストプラクティスは[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#peppering)を参考にすると良い
    - パスワード保存の手段
        - saltを使う
        - pepperを使う：HMACを使う。パスワードハッシュ(本文)と共有鍵(Hardware Security Modulesにしまう)を元にもう一度ハッシュをかける。
        - WorkFactorを使う：各パスワードに対してハッシュを何回か反復する。
    - パスワードハッシュの手段
        - **Argon2id** <= 今回はこれをpythonライブラリで実装する
        - scrypt
        - etc...
- CodeQLの結果
    - セキュリティタブ
        ![Code scanning](./imgs/CodeScannig.png)
    - 詳細
        ![Measure1](./imgs/Measure1.png)
        ![Measure2](./imgs/Measure2.png)
        ![Measure3](./imgs/Measure3.png)
        ![Measure4](./imgs/Measure4.png)

/*
===============================================================================
BANKING TRANSACTION MANAGEMENT SYSTEM
Oracle Database + SQL + PL/SQL
Complete Project SQL Script
===============================================================================

GitHub-ready master script containing:
1. User/schema setup notes
2. Table creation
3. Sample data
4. Sequence
5. PL/SQL procedures/functions
6. Triggers
7. View
8. Indexes
9. CRUD queries
10. Banking operation test queries
11. Reporting/analytics queries
12. Constraint and error tests
13. Verification queries

IMPORTANT:
- Run the object/data section while connected as BANKUSER in FREEPDB1.
- Some test statements intentionally generate errors. They are marked clearly.
- COMMIT statements are included because the original project testing used them.
===============================================================================
*/


/* ============================================================================
   0. ORACLE USER SETUP
   ============================================================================
   Run as an administrative user in FREEPDB1 if BANKUSER does not exist.

CREATE USER bankuser IDENTIFIED BY "Banking@123";
GRANT CONNECT, RESOURCE TO bankuser;
ALTER USER bankuser QUOTA UNLIMITED ON USERS;

-- Verify:
SELECT username
FROM all_users
WHERE username = 'BANKUSER';

-- After reconnecting as BANKUSER:
SELECT USER FROM dual;

SELECT SYS_CONTEXT('USERENV', 'CON_NAME') AS CONTAINER
FROM dual;
*/


/* ============================================================================
   1. CLEANUP (OPTIONAL)
   ============================================================================
   Use this section ONLY if you want to rebuild the project from scratch.
   Run carefully because it deletes project objects/data.
===============================================================================

BEGIN
    EXECUTE IMMEDIATE 'DROP VIEW customer_account_view';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER validate_transaction';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER check_balance';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP PROCEDURE transfer_money';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP PROCEDURE withdraw_money';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP PROCEDURE deposit_money';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP FUNCTION get_balance';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE transaction_seq';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE transactions CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE accounts CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE customers CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

*/


/* ============================================================================
   2. CUSTOMERS TABLE
=============================================================================== */

CREATE TABLE customers (
    customer_id NUMBER PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    phone VARCHAR2(15),
    email VARCHAR2(100)
);


/* ============================================================================
   3. ACCOUNTS TABLE
=============================================================================== */

CREATE TABLE accounts (
    account_no NUMBER PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    account_type VARCHAR2(20) NOT NULL,
    balance NUMBER(12,2) DEFAULT 0,
    status VARCHAR2(20) DEFAULT 'ACTIVE',

    CONSTRAINT fk_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
);


/* ============================================================================
   4. TRANSACTIONS TABLE
=============================================================================== */

CREATE TABLE transactions (
    transaction_id NUMBER PRIMARY KEY,
    account_no NUMBER NOT NULL,
    transaction_type VARCHAR2(20) NOT NULL,
    amount NUMBER(12,2) NOT NULL,
    transaction_date DATE DEFAULT SYSDATE,

    CONSTRAINT fk_account
        FOREIGN KEY (account_no)
        REFERENCES accounts(account_no)
);


/* ============================================================================
   5. SAMPLE CUSTOMERS
=============================================================================== */

INSERT INTO customers (
    customer_id,
    name,
    phone,
    email
)
VALUES (
    1,
    'Rahul Sharma',
    '9876543210',
    'rahul@gmail.com'
);

INSERT INTO customers (
    customer_id,
    name,
    phone,
    email
)
VALUES (
    2,
    'Aman Verma',
    '9876501234',
    'aman@gmail.com'
);

INSERT INTO customers (
    customer_id,
    name,
    phone,
    email
)
VALUES (
    3,
    'Priya Singh',
    '9876512345',
    'priya@gmail.com'
);

COMMIT;


/* ============================================================================
   6. SAMPLE ACCOUNTS
=============================================================================== */

INSERT INTO accounts (
    account_no,
    customer_id,
    account_type,
    balance,
    status
)
VALUES (
    1001,
    1,
    'SAVINGS',
    5000,
    'ACTIVE'
);

INSERT INTO accounts (
    account_no,
    customer_id,
    account_type,
    balance,
    status
)
VALUES (
    1002,
    2,
    'SAVINGS',
    3000,
    'ACTIVE'
);

INSERT INTO accounts (
    account_no,
    customer_id,
    account_type,
    balance,
    status
)
VALUES (
    1003,
    3,
    'CURRENT',
    10000,
    'ACTIVE'
);

COMMIT;


/* ============================================================================
   7. VERIFY INITIAL DATA
=============================================================================== */

SELECT *
FROM customers
ORDER BY customer_id;

SELECT *
FROM accounts
ORDER BY account_no;


/* ============================================================================
   8. TRANSACTION SEQUENCE
=============================================================================== */

CREATE SEQUENCE transaction_seq
START WITH 1
INCREMENT BY 1;


/* ============================================================================
   9. DEPOSIT PROCEDURE
=============================================================================== */

CREATE OR REPLACE PROCEDURE deposit_money(
    p_account_no IN NUMBER,
    p_amount     IN NUMBER
)
IS
BEGIN
    IF p_amount <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'Amount must be greater than zero'
        );
    END IF;

    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_no = p_account_no
      AND status = 'ACTIVE';

    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20002,
            'Account not found or inactive'
        );
    END IF;

    INSERT INTO transactions (
        transaction_id,
        account_no,
        transaction_type,
        amount,
        transaction_date
    )
    VALUES (
        transaction_seq.NEXTVAL,
        p_account_no,
        'DEPOSIT',
        p_amount,
        SYSDATE
    );

    COMMIT;
END;
/


/* ============================================================================
   10. TEST DEPOSIT
=============================================================================== */

BEGIN
    deposit_money(1001, 2000);
END;
/

SELECT *
FROM accounts
WHERE account_no = 1001;

SELECT *
FROM transactions
WHERE account_no = 1001
ORDER BY transaction_id;


/* ============================================================================
   11. WITHDRAW PROCEDURE
=============================================================================== */

CREATE OR REPLACE PROCEDURE withdraw_money(
    p_account_no IN NUMBER,
    p_amount     IN NUMBER
)
IS
    v_balance NUMBER;
BEGIN
    IF p_amount <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20003,
            'Amount must be greater than zero'
        );
    END IF;

    SELECT balance
    INTO v_balance
    FROM accounts
    WHERE account_no = p_account_no
      AND status = 'ACTIVE';

    IF v_balance < p_amount THEN
        RAISE_APPLICATION_ERROR(
            -20004,
            'Insufficient balance'
        );
    END IF;

    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_no = p_account_no;

    INSERT INTO transactions (
        transaction_id,
        account_no,
        transaction_type,
        amount,
        transaction_date
    )
    VALUES (
        transaction_seq.NEXTVAL,
        p_account_no,
        'WITHDRAW',
        p_amount,
        SYSDATE
    );

    COMMIT;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(
            -20005,
            'Account not found or inactive'
        );
END;
/


/* ============================================================================
   12. TEST WITHDRAW
=============================================================================== */

BEGIN
    withdraw_money(1001, 1000);
END;
/

SELECT *
FROM accounts
WHERE account_no = 1001;

SELECT *
FROM transactions
WHERE account_no = 1001
ORDER BY transaction_id;


/* ============================================================================
   13. TEST INVALID WITHDRAWAL
   EXPECTED ERROR: ORA-20004 Insufficient balance
===============================================================================

BEGIN
    withdraw_money(1001, 10000);
END;
/

*/


/* ============================================================================
   14. GET BALANCE FUNCTION
=============================================================================== */

CREATE OR REPLACE FUNCTION get_balance(
    p_account_no NUMBER
)
RETURN NUMBER
IS
    v_balance NUMBER;
BEGIN
    SELECT balance
    INTO v_balance
    FROM accounts
    WHERE account_no = p_account_no;

    RETURN v_balance;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
/


/* ============================================================================
   15. TEST GET BALANCE
=============================================================================== */

SELECT get_balance(1001) AS current_balance
FROM dual;


/* ============================================================================
   16. TRANSFER PROCEDURE
=============================================================================== */

CREATE OR REPLACE PROCEDURE transfer_money(
    p_from_account IN NUMBER,
    p_to_account   IN NUMBER,
    p_amount       IN NUMBER
)
IS
    v_balance NUMBER;
    v_count   NUMBER;
BEGIN
    IF p_amount <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20006,
            'Amount must be greater than zero'
        );
    END IF;

    IF p_from_account = p_to_account THEN
        RAISE_APPLICATION_ERROR(
            -20007,
            'Cannot transfer to same account'
        );
    END IF;

    SELECT balance
    INTO v_balance
    FROM accounts
    WHERE account_no = p_from_account
      AND status = 'ACTIVE';

    IF v_balance < p_amount THEN
        RAISE_APPLICATION_ERROR(
            -20008,
            'Insufficient balance'
        );
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM accounts
    WHERE account_no = p_to_account
      AND status = 'ACTIVE';

    IF v_count = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20009,
            'Destination account not found'
        );
    END IF;

    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_no = p_from_account;

    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_no = p_to_account;

    INSERT INTO transactions
    VALUES (
        transaction_seq.NEXTVAL,
        p_from_account,
        'TRANSFER_OUT',
        p_amount,
        SYSDATE
    );

    INSERT INTO transactions
    VALUES (
        transaction_seq.NEXTVAL,
        p_to_account,
        'TRANSFER_IN',
        p_amount,
        SYSDATE
    );

    COMMIT;
END;
/


/* ============================================================================
   17. TEST TRANSFER
=============================================================================== */

BEGIN
    transfer_money(1001, 1002, 500);
END;
/

SELECT *
FROM accounts
WHERE account_no IN (1001, 1002)
ORDER BY account_no;

SELECT *
FROM transactions
WHERE account_no IN (1001, 1002)
ORDER BY transaction_id;


/* ============================================================================
   18. CHECK BALANCE TRIGGER
=============================================================================== */

CREATE OR REPLACE TRIGGER check_balance
BEFORE UPDATE OF balance ON accounts
FOR EACH ROW
BEGIN
    IF :NEW.balance < 0 THEN
        RAISE_APPLICATION_ERROR(
            -20100,
            'Balance cannot be negative'
        );
    END IF;
END;
/


/* ============================================================================
   19. TEST CHECK BALANCE TRIGGER
   EXPECTED ERROR: ORA-20100 Balance cannot be negative
===============================================================================

UPDATE accounts
SET balance = -500
WHERE account_no = 1001;

*/


/* ============================================================================
   20. VALIDATE TRANSACTION TRIGGER
=============================================================================== */

CREATE OR REPLACE TRIGGER validate_transaction
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    IF :NEW.amount <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20101,
            'Transaction amount must be positive'
        );
    END IF;
END;
/


/* ============================================================================
   21. TEST TRANSACTION VALIDATION TRIGGER
   EXPECTED ERROR: ORA-20101
===============================================================================

INSERT INTO transactions (
    transaction_id,
    account_no,
    transaction_type,
    amount,
    transaction_date
)
VALUES (
    transaction_seq.NEXTVAL,
    1001,
    'DEPOSIT',
    -100,
    SYSDATE
);

*/


/* ============================================================================
   22. CUSTOMER ACCOUNT VIEW
=============================================================================== */

CREATE OR REPLACE VIEW customer_account_view AS
SELECT
    c.customer_id,
    c.name,
    c.phone,
    c.email,
    a.account_no,
    a.account_type,
    a.balance,
    a.status
FROM customers c
JOIN accounts a
    ON c.customer_id = a.customer_id;


/* ============================================================================
   23. TEST VIEW
=============================================================================== */

SELECT *
FROM customer_account_view
ORDER BY customer_id;


/* ============================================================================
   24. INDEXES
=============================================================================== */

CREATE INDEX idx_transaction_account
ON transactions(account_no);

CREATE INDEX idx_transaction_date
ON transactions(transaction_date);


/* ============================================================================
   25. CRUD - CREATE CUSTOMER
=============================================================================== */

INSERT INTO customers (
    customer_id,
    name,
    phone,
    email
)
VALUES (
    4,
    'Rohit Kumar',
    '9876000000',
    'rohit@gmail.com'
);

COMMIT;


/* ============================================================================
   26. CRUD - READ CUSTOMER
=============================================================================== */

SELECT *
FROM customers
WHERE customer_id = 4;


/* ============================================================================
   27. CRUD - UPDATE CUSTOMER
=============================================================================== */

UPDATE customers
SET phone = '9876111111'
WHERE customer_id = 4;

COMMIT;

SELECT *
FROM customers
WHERE customer_id = 4;


/* ============================================================================
   28. CRUD - DELETE CUSTOMER
=============================================================================== */

DELETE FROM customers
WHERE customer_id = 4;

COMMIT;

SELECT *
FROM customers
WHERE customer_id = 4;


/* ============================================================================
   29. TRANSACTION HISTORY REPORT
=============================================================================== */

SELECT
    c.name,
    a.account_no,
    a.account_type,
    t.transaction_id,
    t.transaction_type,
    t.amount,
    t.transaction_date
FROM customers c
JOIN accounts a
    ON c.customer_id = a.customer_id
JOIN transactions t
    ON a.account_no = t.account_no
ORDER BY t.transaction_date DESC;


/* ============================================================================
   30. TOTAL BANK BALANCE
=============================================================================== */

SELECT
    SUM(balance) AS total_bank_balance
FROM accounts;


/* ============================================================================
   31. TOTAL ACCOUNTS
=============================================================================== */

SELECT
    COUNT(*) AS total_accounts
FROM accounts;


/* ============================================================================
   32. TOTAL DEPOSITS
=============================================================================== */

SELECT
    SUM(amount) AS total_deposits
FROM transactions
WHERE transaction_type = 'DEPOSIT';


/* ============================================================================
   33. TOTAL WITHDRAWALS
=============================================================================== */

SELECT
    SUM(amount) AS total_withdrawals
FROM transactions
WHERE transaction_type = 'WITHDRAW';


/* ============================================================================
   34. GROUP BY TRANSACTION TYPE
=============================================================================== */

SELECT
    transaction_type,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
FROM transactions
GROUP BY transaction_type;


/* ============================================================================
   35. HAVING CLAUSE
=============================================================================== */

SELECT
    transaction_type,
    SUM(amount) AS total_amount
FROM transactions
GROUP BY transaction_type
HAVING SUM(amount) > 1000;


/* ============================================================================
   36. CUSTOMER-WISE TRANSACTION COUNT
=============================================================================== */

SELECT
    c.customer_id,
    c.name,
    a.account_no,
    a.balance,
    COUNT(t.transaction_id) AS total_transactions
FROM customers c
JOIN accounts a
    ON c.customer_id = a.customer_id
LEFT JOIN transactions t
    ON a.account_no = t.account_no
GROUP BY
    c.customer_id,
    c.name,
    a.account_no,
    a.balance
ORDER BY c.customer_id;


/* ============================================================================
   37. CUSTOMER-WISE DEPOSIT/WITHDRAW SUMMARY
=============================================================================== */

SELECT
    c.name,
    a.account_no,
    SUM(
        CASE
            WHEN t.transaction_type = 'DEPOSIT'
            THEN t.amount
            ELSE 0
        END
    ) AS total_deposit,
    SUM(
        CASE
            WHEN t.transaction_type = 'WITHDRAW'
            THEN t.amount
            ELSE 0
        END
    ) AS total_withdraw
FROM customers c
JOIN accounts a
    ON c.customer_id = a.customer_id
LEFT JOIN transactions t
    ON a.account_no = t.account_no
GROUP BY
    c.name,
    a.account_no;


/* ============================================================================
   38. COMPLETE DATABASE VERIFICATION
=============================================================================== */

SELECT 'CUSTOMERS' AS table_name, COUNT(*) AS row_count
FROM customers
UNION ALL
SELECT 'ACCOUNTS', COUNT(*)
FROM accounts
UNION ALL
SELECT 'TRANSACTIONS', COUNT(*)
FROM transactions;


/* ============================================================================
   39. VERIFY CUSTOMER-ACCOUNT RELATIONSHIP
=============================================================================== */

SELECT
    c.customer_id,
    c.name,
    a.account_no,
    a.account_type,
    a.balance,
    a.status
FROM customers c
JOIN accounts a
    ON c.customer_id = a.customer_id
ORDER BY c.customer_id;


/* ============================================================================
   40. VERIFY ALL TRANSACTIONS
=============================================================================== */

SELECT
    transaction_id,
    account_no,
    transaction_type,
    amount,
    transaction_date
FROM transactions
ORDER BY transaction_id;


/* ============================================================================
   41. VERIFY DATABASE OBJECTS
=============================================================================== */

SELECT object_name, object_type, status
FROM user_objects
WHERE object_name IN (
    'CUSTOMERS',
    'ACCOUNTS',
    'TRANSACTIONS',
    'TRANSACTION_SEQ',
    'DEPOSIT_MONEY',
    'WITHDRAW_MONEY',
    'GET_BALANCE',
    'TRANSFER_MONEY',
    'CHECK_BALANCE',
    'VALIDATE_TRANSACTION',
    'CUSTOMER_ACCOUNT_VIEW'
)
ORDER BY object_type, object_name;


/* ============================================================================
   42. VERIFY TABLE COLUMNS
=============================================================================== */

SELECT
    table_name,
    column_name,
    data_type,
    data_length,
    nullable
FROM user_tab_columns
WHERE table_name IN (
    'CUSTOMERS',
    'ACCOUNTS',
    'TRANSACTIONS'
)
ORDER BY table_name, column_id;


/* ============================================================================
   43. VERIFY CONSTRAINTS
=============================================================================== */

SELECT
    constraint_name,
    constraint_type,
    table_name,
    status
FROM user_constraints
WHERE table_name IN (
    'CUSTOMERS',
    'ACCOUNTS',
    'TRANSACTIONS'
)
ORDER BY table_name, constraint_name;


/* ============================================================================
   44. VERIFY INDEXES
=============================================================================== */

SELECT
    index_name,
    table_name,
    uniqueness,
    status
FROM user_indexes
WHERE table_name IN (
    'CUSTOMERS',
    'ACCOUNTS',
    'TRANSACTIONS'
)
ORDER BY table_name, index_name;


/* ============================================================================
   45. USEFUL TEST CASES
===============================================================================

-- Invalid deposit amount:
BEGIN
    deposit_money(1001, -100);
END;
/

-- Expected: ORA-20001


-- Invalid withdrawal amount:
BEGIN
    withdraw_money(1001, 0);
END;
/

-- Expected: ORA-20003


-- Invalid transfer amount:
BEGIN
    transfer_money(1001, 1002, -500);
END;
/

-- Expected: ORA-20006


-- Transfer to same account:
BEGIN
    transfer_money(1001, 1001, 500);
END;
/

-- Expected: ORA-20007


-- Insufficient transfer:
BEGIN
    transfer_money(1001, 1002, 999999);
END;
/

-- Expected: ORA-20008


-- Destination account does not exist:
BEGIN
    transfer_money(1001, 9999, 100);
END;
/

-- Expected: ORA-20009


-- Balance function for missing account:
SELECT get_balance(9999)
FROM dual;

-- Expected: NULL


-- Foreign key test:
-- This should fail because account 1001 belongs to customer 1.
INSERT INTO accounts (
    account_no,
    customer_id,
    account_type,
    balance,
    status
)
VALUES (
    9999,
    9999,
    'SAVINGS',
    1000,
    'ACTIVE'
);

-- Expected: foreign key violation.


-- Primary key test:
INSERT INTO customers (
    customer_id,
    name,
    phone,
    email
)
VALUES (
    1,
    'Duplicate Customer',
    '9000000000',
    'duplicate@gmail.com'
);

-- Expected: unique/primary-key violation.


-- NOT NULL test:
INSERT INTO customers (
    customer_id,
    name,
    phone,
    email
)
VALUES (
    99,
    NULL,
    '9000000000',
    'test@gmail.com'
);

-- Expected: NOT NULL violation.


-- WARNING:
-- Never execute the following without a WHERE clause
-- unless you intentionally want to modify every row.
--
-- UPDATE customers SET name = 'Test';
-- DELETE FROM customers;


===============================================================================
END OF BANKING TRANSACTION MANAGEMENT SYSTEM SQL SCRIPT
===============================================================================

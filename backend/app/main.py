import os, re
from datetime import date
from decimal import Decimal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .database import connection, rows

app=FastAPI(title='Nexora Bank API')
allowed_origins = {
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    *[origin.strip() for origin in os.getenv('FRONTEND_ORIGIN', '').split(',') if origin.strip()],
}
app.add_middleware(CORSMiddleware, allow_origins=list(allowed_origins), allow_methods=['*'], allow_headers=['*'])
class Amount(BaseModel): amount: Decimal=Field(gt=0)
class Transfer(BaseModel): from_account:int; to_account:int; amount:Decimal=Field(gt=0)
class Customer(BaseModel): name:str; phone:str|None=None; email:str|None=None
def clean(v):
    if isinstance(v,Decimal): return float(v)
    if hasattr(v,'isoformat'): return v.isoformat()
    return v
def result(cur): return [{k:clean(v) for k,v in r.items()} for r in rows(cur)]
def db_error(e):
    msg=str(e)
    if 'ORA-20001' in msg or 'ORA-20002' in msg: return 'Insufficient balance for this withdrawal.'
    if 'ORA-20003' in msg or 'ORA-20004' in msg: return 'Amount must be greater than zero.'
    if 'ORA-20005' in msg or 'ORA-20006' in msg: return 'Account not found or inactive.'
    return 'Unable to complete the Oracle transaction.'
@app.get('/api/health')
def health():
    try:
        with connection() as c: c.cursor().execute('select 1 from dual')
        return {'status':'healthy','database':'Oracle','service':os.getenv('DB_SERVICE','FREEPDB1')}
    except Exception: return {'status':'unhealthy','database':'Oracle','service':os.getenv('DB_SERVICE','FREEPDB1')}
@app.get('/api/customers')
def customers():
    with connection() as c:
        cur=c.cursor();cur.execute('''select c.customer_id,c.name,c.phone,c.email,count(a.account_no) account_count from customers c left join accounts a on a.customer_id=c.customer_id group by c.customer_id,c.name,c.phone,c.email order by c.customer_id''');return result(cur)
@app.get('/api/customers/{customer_id}')
def customer(customer_id:int):
    with connection() as c:
        cur=c.cursor();cur.execute('select customer_id,name,phone,email from customers where customer_id=:id',id=customer_id);r=result(cur); 
        if not r: raise HTTPException(404,'Customer not found')
        return r[0]
@app.post('/api/customers')
def create_customer(x:Customer):
    with connection() as c:
        cur=c.cursor();cur.execute('insert into customers(customer_id,name,phone,email) values((select nvl(max(customer_id),0)+1 from customers),:name,:phone,:email)',x.model_dump());c.commit();return {'message':'Customer created'}
@app.put('/api/customers/{customer_id}')
def update_customer(customer_id:int,x:Customer):
    with connection() as c:
        cur=c.cursor();cur.execute('update customers set name=:name,phone=:phone,email=:email where customer_id=:id',id=customer_id,**x.model_dump());c.commit();return {'message':'Customer updated'}
@app.delete('/api/customers/{customer_id}')
def delete_customer(customer_id:int):
    try:
        with connection() as c:c.cursor().execute('delete from customers where customer_id=:id',id=customer_id);c.commit()
        return {'message':'Customer deleted'}
    except Exception as e: raise HTTPException(400,'Customer cannot be deleted while accounts exist.')
@app.get('/api/accounts')
def accounts():
    with connection() as c:
        cur=c.cursor();cur.execute('''select a.account_no,a.customer_id,c.name customer_name,a.account_type,a.balance,a.status from accounts a join customers c on c.customer_id=a.customer_id order by a.account_no''');return result(cur)
@app.get('/api/accounts/{account_no}')
def account(account_no:int):
    with connection() as c:
        cur=c.cursor();cur.execute('''select a.account_no,a.customer_id,c.name customer_name,a.account_type,a.balance,a.status from accounts a join customers c on c.customer_id=a.customer_id where a.account_no=:id''',id=account_no);r=result(cur)
        if not r: raise HTTPException(404,'Account not found or inactive.')
        return r[0]
@app.get('/api/accounts/{account_no}/balance')
def balance(account_no:int):
    with connection() as c:
        cur=c.cursor();cur.execute('select get_balance(:id) balance from dual',id=account_no);r=result(cur);return r[0]
def call_proc(name, args):
    try:
        with connection() as c:
            c.cursor().callproc(name,args);c.commit();return {'message':'Transaction completed successfully'}
    except Exception as e: raise HTTPException(400,db_error(e))
@app.post('/api/accounts/{account_no}/deposit')
def deposit(account_no:int,x:Amount): return call_proc('deposit_money',[account_no,x.amount])
@app.post('/api/accounts/{account_no}/withdraw')
def withdraw(account_no:int,x:Amount): return call_proc('withdraw_money',[account_no,x.amount])
@app.post('/api/transfers')
def transfer(x:Transfer): return call_proc('transfer_money',[x.from_account,x.to_account,x.amount])
@app.get('/api/transactions')
def transactions(account_no:int|None=None,transaction_type:str|None=None,start_date:date|None=None,end_date:date|None=None):
    sql='''select t.transaction_id,t.account_no,t.transaction_type,t.amount,t.transaction_date,c.name customer_name from transactions t join accounts a on a.account_no=t.account_no join customers c on c.customer_id=a.customer_id where 1=1''';p={}
    if account_no is not None:sql+=' and t.account_no=:account_no';p['account_no']=account_no
    if transaction_type:sql+=' and t.transaction_type=:transaction_type';p['transaction_type']=transaction_type
    if start_date:sql+=' and t.transaction_date>=:start_date';p['start_date']=start_date
    if end_date:sql+=' and t.transaction_date<:end_date+1';p['end_date']=end_date
    sql+=' order by t.transaction_date desc,t.transaction_id desc'
    with connection() as c:cur=c.cursor();cur.execute(sql,p);return result(cur)
@app.get('/api/dashboard/stats')
def stats():
    with connection() as c:
        cur=c.cursor();cur.execute('select count(*) total_accounts,nvl(sum(balance),0) total_balance from accounts');a=result(cur)[0];cur.execute('select count(*) total_customers from customers');a.update(result(cur)[0]);cur.execute('select count(*) total_transactions from transactions');a.update(result(cur)[0]);return a
@app.get('/api/analytics/transactions')
def analytics():
    with connection() as c:
        cur=c.cursor();cur.execute("select to_char(transaction_date,'DD Mon') label, sum(amount) total, sum(case when transaction_type='DEPOSIT' then amount else 0 end) deposits, sum(case when transaction_type='WITHDRAW' then amount else 0 end) withdrawals, sum(case when transaction_type in ('TRANSFER_IN','TRANSFER_OUT') then amount else 0 end) transfers from transactions group by to_char(transaction_date,'DD Mon'),trunc(transaction_date) order by trunc(transaction_date)");return result(cur)
@app.get('/api/reports')
def reports():
    with connection() as c:
        cur=c.cursor();cur.execute("select nvl(sum(case when transaction_type='DEPOSIT' then amount end),0) total_deposits,nvl(sum(case when transaction_type='WITHDRAW' then amount end),0) total_withdrawals,nvl(sum(case when transaction_type in ('TRANSFER_IN','TRANSFER_OUT') then amount end),0) total_transfers from transactions");return result(cur)[0]

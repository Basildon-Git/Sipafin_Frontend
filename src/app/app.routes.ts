import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Layout } from './pages/layout/layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { UserAccounts } from './pages/administration/user-accounts/user-accounts';
import { NewUserAccount } from './pages/administration/new-user-account/new-user-account';
import { Branches } from './pages/administration/branches/branches';
import { NewBranch } from './pages/administration/new-branch/new-branch';
import { Banks } from './pages/banking/banks/banks';
import { NewBank } from './pages/banking/new-bank/new-bank';
import { NewBankAccount } from './pages/banking/new-bank-account/new-bank-account';
import { BankingAccounts } from './pages/banking/banking-accounts/banking-accounts';
import { Investors } from './pages/banking/investors/investors';
import { NewInvestor } from './pages/banking/new-investor/new-investor';
import { Loans } from './pages/banking/loans/loans';
import { NewLoan } from './pages/banking/new-loan/new-loan';
import { Commissions } from './pages/cash_management/commissions/commissions';
import { NewCommission } from './pages/cash_management/new-commission/new-commission';
import { Expenses } from './pages/cash_management/expenses/expenses';
import { NewExpense } from './pages/cash_management/new-expense/new-expense';
import { PettyCashFlow } from './pages/cash_management/petty-cash-flow/petty-cash-flow';
import { NewPettyCashFlow } from './pages/cash_management/new-petty-cash-flow/new-petty-cash-flow';
import { BankTransactions } from './pages/cash_management/bank-transactions/bank-transactions';
import { NewBankTransaction } from './pages/cash_management/new-bank-transaction/new-bank-transaction';
import { NewLoanTransaction } from './pages/cash_management/new-loan-transaction/new-loan-transaction';
import { LoanTransactions } from './pages/cash_management/loan-transactions/loan-transactions';
import { NewFinancialTransaction } from './pages/cash_management/new-financial-transaction/new-financial-transaction';
import { CashFloats } from './pages/cash_management/cash-floats/cash-floats';
import { authGuard } from './core/guards/auth-guard';
import { PettyCashBranchAccounts } from './pages/cash_management/petty-cash-branch-accounts/petty-cash-branch-accounts';
import { NewPettyCashBranchAccount } from './pages/cash_management/new-petty-cash-branch-account/new-petty-cash-branch-account';
import { HomePage } from './pages/website/home-page/home-page';
import { About } from './pages/website/about/about';
import { CarHire } from './pages/website/car-hire/car-hire';
import { Reconciliations } from './pages/banking/reconciliations/reconciliations';
import { ClientLoans } from './pages/banking/client-loans/client-loans';
import { NewClientLoan } from './pages/banking/new-client-loan/new-client-loan';
import { NewClientLoanTransactions } from './pages/banking/new-client-loan-transactions/new-client-loan-transactions';
import { ClientLoanTransactions } from './pages/banking/client-loan-transactions/client-loan-transactions';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'about',
    component: About,
  },
  {
    path: 'car-hire',
    component: CarHire,
  },
  {
    path: '',
    component: Layout,
    canActivateChild: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'users',
        component: UserAccounts,
      },
      {
        path: 'users/new',
        component: NewUserAccount,
        data: { role: ['ADMIN'] },
      },
      {
        path: 'users/edit/:id',
        component: NewUserAccount,
        data: { role: ['ADMIN'] },
      },
      {
        path: 'branches',
        component: Branches,
      },
      {
        path: 'branches/new',
        component: NewBranch,
      },
      {
        path: 'branches/edit/:id',
        component: NewBranch,
      },
      {
        path: 'banks',
        component: Banks,
      },
      {
        path: 'banks/new',
        component: NewBank,
      },
      {
        path: 'banks/edit/:id',
        component: NewBank,
      },
      {
        path: 'bank-accounts',
        component: BankingAccounts,
      },
      {
        path: 'bank-accounts/new',
        component: NewBankAccount,
      },
      {
        path: 'bank-accounts/edit/:id',
        component: NewBankAccount,
      },
      {
        path: 'investors',
        component: Investors,
      },
      {
        path: 'investors/new',
        component: NewInvestor,
      },
      {
        path: 'investors/edit/:id',
        component: NewInvestor,
      },
      {
        path: 'loans',
        component: Loans,
      },
      {
        path: 'loans/new',
        component: NewLoan,
      },
      {
        path: 'loans/edit/:id',
        component: NewLoan,
      },
      {
        path: 'commissions',
        component: Commissions,
      },
      {
        path: 'commissions/new',
        component: NewCommission,
      },
      {
        path: 'commissions/edit/:id',
        component: NewCommission,
      },
      {
        path: 'expenses',
        component: Expenses,
      },
      {
        path: 'expenses/new',
        component: NewExpense,
      },
      {
        path: 'expenses/edit/:id',
        component: NewExpense,
      },
      {
        path: 'cash-flows',
        component: PettyCashFlow,
      },
      {
        path: 'cash-flows/new',
        component: NewPettyCashFlow,
      },
      {
        path: 'cash-flows/edit/:id',
        component: NewPettyCashFlow,
      },
      {
        path: 'cash-floats',
        component: CashFloats,
      },
      {
        path: 'bank-transactions',
        component: BankTransactions,
      },
      {
        path: 'reconciliations',
        component: Reconciliations,
      },
      {
        path: 'bank-transactions/new',
        component: NewBankTransaction,
      },
      {
        path: 'bank-transactions/edit/:id',
        component: NewBankTransaction,
      },
      {
        path: 'loan-transactions',
        component: LoanTransactions,
      },
      {
        path: 'loan-transactions/new',
        component: NewLoanTransaction,
      },
      {
        path: 'loan-transactions/edit/:id',
        component: NewLoanTransaction,
      },
      {
        path: 'client-loans',
        component: ClientLoans,
      },
      {
        path: 'client-loans/new',
        component: NewClientLoan,
      },
      {
        path: 'client-loan-transactions',
        component: ClientLoanTransactions,
      },
      {
        path: 'client-loan-transactions/new',
        component: NewClientLoanTransactions,
      },
      {
        path: 'financial-transactions/new',
        component: NewFinancialTransaction,
      },
      {
        path: 'petty-cash-accounts',
        component: PettyCashBranchAccounts,
      },
      {
        path: 'petty-cash-accounts/new',
        component: NewPettyCashBranchAccount,
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];

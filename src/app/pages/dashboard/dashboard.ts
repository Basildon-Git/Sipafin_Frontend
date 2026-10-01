import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  today = new Date();

  stats = [
    {
      title: 'Total Cash Position',
      value: '$2,480,650',
      change: '+8.4%',
      description: 'vs. previous month',
      icon: 'bi-wallet2',
      type: 'primary'
    },
    {
      title: 'Available Balance',
      value: '$1,845,320',
      change: '+5.2%',
      description: 'across all banks',
      icon: 'bi-bank',
      type: 'blue'
    },
    {
      title: 'Today\'s Inflows',
      value: '$184,250',
      change: '+12.6%',
      description: 'from 32 transactions',
      icon: 'bi-arrow-down-left',
      type: 'green'
    },
    {
      title: 'Today\'s Outflows',
      value: '$96,430',
      change: '-3.8%',
      description: 'from 18 transactions',
      icon: 'bi-arrow-up-right',
      type: 'orange'
    }
  ];

  banks = [
    {
      name: 'CBZ Bank',
      account: '•••• 4821',
      balance: '$845,320',
      percentage: 34
    },
    {
      name: 'Stanbic Bank',
      account: '•••• 7214',
      balance: '$624,850',
      percentage: 25
    },
    {
      name: 'Nedbank',
      account: '•••• 3156',
      balance: '$492,180',
      percentage: 20
    },
    {
      name: 'FBC Bank',
      account: '•••• 9082',
      balance: '$338,470',
      percentage: 14
    },
    {
      name: 'Other',
      account: 'Multiple accounts',
      balance: '$179,830',
      percentage: 7
    }
  ];

  activities = [
    {
      type: 'deposit',
      title: 'Cash deposit received',
      description: 'CBZ Bank • Account 4821',
      amount: '+$45,000',
      time: '12 minutes ago'
    },
    {
      type: 'withdrawal',
      title: 'Cash withdrawal',
      description: 'Harare Branch • Float',
      amount: '-$8,500',
      time: '34 minutes ago'
    },
    {
      type: 'transfer',
      title: 'Bank transfer completed',
      description: 'Stanbic → CBZ',
      amount: '+$25,000',
      time: '1 hour ago'
    },
    {
      type: 'deposit',
      title: 'Cash deposit received',
      description: 'Nedbank • Account 3156',
      amount: '+$18,750',
      time: '2 hours ago'
    }
  ];

  cashFloats = [
    {
      location: 'Harare Branch',
      balance: '$48,250',
      percentage: 82,
      status: 'Healthy'
    },
    {
      location: 'Bulawayo Branch',
      balance: '$31,850',
      percentage: 65,
      status: 'Healthy'
    },
    {
      location: 'Chitungwiza Branch',
      balance: '$12,420',
      percentage: 38,
      status: 'Low'
    }
  ];
}
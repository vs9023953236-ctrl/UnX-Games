import { Order, User } from '../types';
import { formatNPR } from './formatters';

export const exportOrdersToCSV = (orders: Order[]) => {
  const headers = [
    'Order ID',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Product',
    'Game',
    'Package',
    'Player ID / UID',
    'Server / Zone',
    'Amount (NPR)',
    'Payment Method',
    'Transaction Ref',
    'Status',
    'Created At',
  ];

  const rows = orders.map((o) => [
    `"${o.id}"`,
    `"${(o.userName || '').replace(/"/g, '""')}"`,
    `"${(o.userEmail || '').replace(/"/g, '""')}"`,
    `"${(o.userPhone || '').replace(/"/g, '""')}"`,
    `"${(o.productName || '').replace(/"/g, '""')}"`,
    `"${(o.gameName || '').replace(/"/g, '""')}"`,
    `"${(o.packageName || '').replace(/"/g, '""')}"`,
    `"${(o.gameUserId || '').replace(/"/g, '""')}"`,
    `"${(o.server || o.zoneId || '').replace(/"/g, '""')}"`,
    o.amount,
    `"${(o.paymentMethod || '').toUpperCase()}"`,
    `"${(o.transactionId || '').replace(/"/g, '""')}"`,
    `"${o.orderStatus}"`,
    `"${o.createdAt}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `unxgames_orders_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportUsersToCSV = (users: User[]) => {
  const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];

  const rows = users.map((u) => [
    `"${u.uid}"`,
    `"${(u.name || '').replace(/"/g, '""')}"`,
    `"${(u.email || '').replace(/"/g, '""')}"`,
    `"${(u.phone || '').replace(/"/g, '""')}"`,
    `"${u.role}"`,
    `"${u.status}"`,
    `"${u.createdAt}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `unxgames_users_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSalesReportToCSV = (orders: Order[]) => {
  const completedOrders = orders.filter((o) => o.orderStatus === 'completed' || o.orderStatus === 'payment_verified');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.amount, 0);

  const headers = ['Metric', 'Value'];
  const summaryRows = [
    ['"Total Revenue (NPR)"', totalRevenue],
    ['"Total Orders Completed"', completedOrders.length],
    ['"Generated Date"', `"${new Date().toISOString()}"`],
    ['', ''],
    ['Order ID', 'Product', 'Customer', 'Amount (NPR)', 'Date'],
    ...completedOrders.map((o) => [
      `"${o.id}"`,
      `"${o.productName} (${o.packageName})"`,
      `"${o.userName}"`,
      o.amount,
      `"${o.createdAt}"`,
    ]),
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + summaryRows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `unxgames_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportUsersToCSV, exportOrdersToCSV, exportSalesReportToCSV } from '../../utils/csvExport';
import { User, Order } from '../../types';

describe('csvExport', () => {
  let mockLink: any;

  beforeEach(() => {
    // Mock the necessary DOM elements for CSV export
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportUsersToCSV', () => {
    it('should correctly format and export user data', () => {
      const users: User[] = [
        {
          uid: '123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          role: 'customer',
          status: 'active',
          createdAt: '2023-01-01T00:00:00.000Z'
        } as unknown as User
      ];

      exportUsersToCSV(users);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:text/csv'));
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/^(unxgames|gamehub)_users_\d{4}-\d{2}-\d{2}\.csv$/));
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);

      // Verify CSV content
      const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
      expect(hrefArgs).toBeDefined();
      const encodedContent = hrefArgs[1];
      const decodedContent = decodeURI(encodedContent);

      expect(decodedContent).toContain('User ID,Name,Email,Phone,Role,Status,Joined Date');
      expect(decodedContent).toContain('"123","John Doe","john@example.com","1234567890","customer","active","2023-01-01T00:00:00.000Z"');
    });

    it('should handle users with missing fields', () => {
      const users: User[] = [
        {
          uid: '456',
          // name missing
          // email missing
          // phone missing
          role: 'admin',
          status: 'inactive',
          createdAt: '2023-02-01T00:00:00.000Z'
        } as unknown as User
      ];

      exportUsersToCSV(users);

      const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
      const decodedContent = decodeURI(hrefArgs[1]);

      expect(decodedContent).toContain('"456","","","","admin","inactive","2023-02-01T00:00:00.000Z"');
    });

    it('should correctly escape quotes in fields', () => {
      const users: User[] = [
        {
          uid: '789',
          name: 'Jane "Doe"',
          email: 'jane"_"@example.com',
          phone: '987"654"3210',
          role: 'customer',
          status: 'active',
          createdAt: '2023-03-01T00:00:00.000Z'
        } as unknown as User
      ];

      exportUsersToCSV(users);

      const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
      const decodedContent = decodeURI(hrefArgs[1]);

      expect(decodedContent).toContain('"789","Jane ""Doe""","jane""_""@example.com","987""654""3210","customer","active","2023-03-01T00:00:00.000Z"');
    });

    it('should handle empty user list', () => {
      exportUsersToCSV([]);

      const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
      const decodedContent = decodeURI(hrefArgs[1]);

      // Should contain headers but no data rows
      expect(decodedContent).toContain('User ID,Name,Email,Phone,Role,Status,Joined Date');
      expect(decodedContent.split('\n').length).toBe(1); // Only headers row
    });
  });

  describe('exportOrdersToCSV', () => {
      it('should correctly format and export order data', () => {
          const orders = [
              {
                  id: 'order_1',
                  userName: 'Test User',
                  userEmail: 'test@example.com',
                  userPhone: '123456',
                  productName: 'Test Product',
                  gameName: 'Test Game',
                  packageName: 'Test Package',
                  gameUserId: 'user_1',
                  server: 'Server A',
                  amount: 100,
                  paymentMethod: 'esewa',
                  transactionId: 'tx_1',
                  orderStatus: 'completed',
                  createdAt: '2024-01-01T00:00:00.000Z'
              }
          ] as unknown as Order[];

          exportOrdersToCSV(orders);

          expect(document.createElement).toHaveBeenCalledWith('a');
          expect(mockLink.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:text/csv'));
          expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/^(unxgames|gamehub)_orders_\d{4}-\d{2}-\d{2}\.csv$/));
          expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
          expect(mockLink.click).toHaveBeenCalled();
          expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);

          const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
          const decodedContent = decodeURI(hrefArgs[1]);

          expect(decodedContent).toContain('Order ID,Customer Name,Customer Email,Customer Phone,Product,Game,Package,Player ID / UID,Server / Zone,Amount (NPR),Payment Method,Transaction Ref,Status,Created At');
          expect(decodedContent).toContain('"order_1","Test User","test@example.com","123456","Test Product","Test Game","Test Package","user_1","Server A",100,"ESEWA","tx_1","completed","2024-01-01T00:00:00.000Z"');
      });

      it('should handle orders with missing fields', () => {
          const orders = [
              {
                  id: 'order_2',
                  amount: 200,
                  orderStatus: 'pending',
                  createdAt: '2024-01-02T00:00:00.000Z'
              }
          ] as unknown as Order[];

          exportOrdersToCSV(orders);

          const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
          const decodedContent = decodeURI(hrefArgs[1]);

          expect(decodedContent).toContain('"order_2","","","","","","","","",200,"","","pending","2024-01-02T00:00:00.000Z"');
      });
  });

  describe('exportSalesReportToCSV', () => {
      it('should correctly summarize and export sales report for completed orders', () => {
          const orders = [
              {
                  id: 'order_1',
                  amount: 100,
                  orderStatus: 'completed',
                  productName: 'Product 1',
                  packageName: 'Package 1',
                  userName: 'User 1',
                  createdAt: '2024-01-01T00:00:00.000Z'
              },
              {
                  id: 'order_2',
                  amount: 200,
                  orderStatus: 'payment_verified',
                  productName: 'Product 2',
                  packageName: 'Package 2',
                  userName: 'User 2',
                  createdAt: '2024-01-02T00:00:00.000Z'
              },
              {
                  id: 'order_3',
                  amount: 300,
                  orderStatus: 'pending',
                  productName: 'Product 3',
                  packageName: 'Package 3',
                  userName: 'User 3',
                  createdAt: '2024-01-03T00:00:00.000Z'
              }
          ] as unknown as Order[];

          exportSalesReportToCSV(orders);

          expect(document.createElement).toHaveBeenCalledWith('a');
          expect(mockLink.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:text/csv'));
          expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/^(unxgames|gamehub)_sales_report_\d{4}-\d{2}-\d{2}\.csv$/));
          expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
          expect(mockLink.click).toHaveBeenCalled();
          expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);

          const hrefArgs = mockLink.setAttribute.mock.calls.find((call: any[]) => call[0] === 'href');
          const decodedContent = decodeURI(hrefArgs[1]);

          // Should only count 'completed' and 'payment_verified'
          expect(decodedContent).toContain('"Total Revenue (NPR)",300');
          expect(decodedContent).toContain('"Total Orders Completed",2');

          // Check details rows
          expect(decodedContent).toContain('Order ID,Product,Customer,Amount (NPR),Date');
          expect(decodedContent).toContain('"order_1","Product 1 (Package 1)","User 1",100,"2024-01-01T00:00:00.000Z"');
          expect(decodedContent).toContain('"order_2","Product 2 (Package 2)","User 2",200,"2024-01-02T00:00:00.000Z"');
          expect(decodedContent).not.toContain('order_3');
      });
  });
});

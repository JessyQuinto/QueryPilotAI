const sql = require('mssql');

const config = {
  user: 'sqladmin',
  password: 'QpDev2026!#x',
  server: 'qpilot-sql-west.database.windows.net',
  database: 'QueryPilotTestDB',
  options: { encrypt: true, trustServerCertificate: false }
};

async function run() {
  const pool = await sql.connect(config);

  // Create tables
  await pool.request().query(`
    CREATE TABLE Customers (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      FullName NVARCHAR(100) NOT NULL,
      Email NVARCHAR(150),
      City NVARCHAR(50),
      Country NVARCHAR(50),
      CreatedAt DATETIME2 DEFAULT GETUTCDATE()
    );

    CREATE TABLE Products (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      Name NVARCHAR(100) NOT NULL,
      Category NVARCHAR(50),
      Price DECIMAL(10,2),
      Stock INT DEFAULT 0
    );

    CREATE TABLE Orders (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      CustomerId INT FOREIGN KEY REFERENCES Customers(Id),
      OrderDate DATETIME2 DEFAULT GETUTCDATE(),
      TotalAmount DECIMAL(12,2),
      Status NVARCHAR(30) DEFAULT 'Pending'
    );

    CREATE TABLE OrderItems (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      OrderId INT FOREIGN KEY REFERENCES Orders(Id),
      ProductId INT FOREIGN KEY REFERENCES Products(Id),
      Quantity INT,
      UnitPrice DECIMAL(10,2)
    );
  `);
  console.log('Tables created');

  // Insert customers
  await pool.request().query(`
    INSERT INTO Customers (FullName, Email, City, Country) VALUES
    ('Maria Garcia', 'maria.garcia@email.com', 'Bogota', 'Colombia'),
    ('Carlos Lopez', 'carlos.lopez@email.com', 'Medellin', 'Colombia'),
    ('Ana Torres', 'ana.torres@email.com', 'Lima', 'Peru'),
    ('Pedro Ramirez', 'pedro.ramirez@email.com', 'Mexico City', 'Mexico'),
    ('Laura Martinez', 'laura.martinez@email.com', 'Buenos Aires', 'Argentina'),
    ('Juan Herrera', 'juan.herrera@email.com', 'Bogota', 'Colombia'),
    ('Sofia Morales', 'sofia.morales@email.com', 'Santiago', 'Chile'),
    ('Diego Fernandez', 'diego.fernandez@email.com', 'Quito', 'Ecuador'),
    ('Valentina Ruiz', 'valentina.ruiz@email.com', 'Medellin', 'Colombia'),
    ('Andres Castro', 'andres.castro@email.com', 'Cali', 'Colombia');
  `);
  console.log('Customers inserted');

  // Insert products
  await pool.request().query(`
    INSERT INTO Products (Name, Category, Price, Stock) VALUES
    ('Laptop Pro 15', 'Electronics', 1299.99, 45),
    ('Wireless Mouse', 'Electronics', 29.99, 200),
    ('USB-C Hub', 'Accessories', 49.99, 150),
    ('Mechanical Keyboard', 'Electronics', 89.99, 80),
    ('Monitor 27 4K', 'Electronics', 449.99, 30),
    ('Webcam HD', 'Electronics', 69.99, 100),
    ('Desk Lamp LED', 'Office', 34.99, 120),
    ('Ergonomic Chair', 'Furniture', 599.99, 25),
    ('Standing Desk', 'Furniture', 799.99, 15),
    ('Noise Cancelling Headphones', 'Electronics', 199.99, 60),
    ('Laptop Bag', 'Accessories', 39.99, 90),
    ('Phone Charger', 'Accessories', 19.99, 300);
  `);
  console.log('Products inserted');

  // Insert orders
  await pool.request().query(`
    INSERT INTO Orders (CustomerId, OrderDate, TotalAmount, Status) VALUES
    (1, '2026-01-15', 1349.98, 'Completed'),
    (2, '2026-01-20', 89.99, 'Completed'),
    (3, '2026-02-05', 549.98, 'Completed'),
    (1, '2026-02-14', 199.99, 'Completed'),
    (4, '2026-03-01', 1899.98, 'Completed'),
    (5, '2026-03-10', 69.99, 'Shipped'),
    (6, '2026-03-15', 139.98, 'Shipped'),
    (7, '2026-04-01', 449.99, 'Processing'),
    (8, '2026-04-10', 834.98, 'Processing'),
    (2, '2026-04-20', 29.99, 'Pending'),
    (9, '2026-05-01', 1329.98, 'Pending'),
    (10, '2026-05-10', 259.98, 'Pending'),
    (3, '2026-05-15', 49.99, 'Pending'),
    (1, '2026-05-17', 629.98, 'Pending');
  `);
  console.log('Orders inserted');

  // Insert order items
  await pool.request().query(`
    INSERT INTO OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES
    (1, 1, 1, 1299.99), (1, 3, 1, 49.99),
    (2, 4, 1, 89.99),
    (3, 5, 1, 449.99), (3, 3, 2, 49.99),
    (4, 10, 1, 199.99),
    (5, 1, 1, 1299.99), (5, 8, 1, 599.99),
    (6, 6, 1, 69.99),
    (7, 2, 2, 29.99), (7, 4, 1, 89.99),
    (8, 5, 1, 449.99), (8, 7, 1, 34.99), (8, 11, 1, 39.99),
    (9, 2, 1, 29.99),
    (10, 1, 1, 1299.99), (10, 2, 1, 29.99),
    (11, 10, 1, 199.99), (11, 12, 3, 19.99),
    (12, 3, 1, 49.99),
    (13, 8, 1, 599.99), (13, 2, 1, 29.99);
  `);
  console.log('OrderItems inserted');

  // Verify
  const result = await pool.request().query(`
    SELECT 'Customers' AS Tbl, COUNT(*) AS Cnt FROM Customers
    UNION ALL SELECT 'Products', COUNT(*) FROM Products
    UNION ALL SELECT 'Orders', COUNT(*) FROM Orders
    UNION ALL SELECT 'OrderItems', COUNT(*) FROM OrderItems
  `);
  console.table(result.recordset);

  await pool.close();
  console.log('Done!');
}

run().catch(err => { console.error(err); process.exit(1); });

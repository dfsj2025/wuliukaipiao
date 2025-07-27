const sqlite3 = require('sqlite3').verbose()
const path = require('path')

// 数据库文件路径
const DB_PATH = path.join(__dirname, '..', 'database.db')

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err)
      
      // 确保表结构是最新的
      db.serialize(() => {
        db.run("PRAGMA foreign_keys = ON")
        
        // 添加缺失的shipment_no列（如果表已存在但缺少该列）
        db.run("ALTER TABLE invoices ADD COLUMN shipment_no TEXT", (err) => {
          // 忽略错误，列可能已存在
        })
        
        // 确保所有表都存在
        db.run(`
          CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            frequent_site TEXT,
            payment_method TEXT,
            default_price REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
          if (err) return reject(err)
          
          db.run(`
            CREATE TABLE IF NOT EXISTS invoices (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              customer_id INTEGER,
              shipment_no TEXT,
              amount REAL NOT NULL,
              date TEXT NOT NULL,
              status TEXT DEFAULT '未支付',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`, (err) => {
            if (err) return reject(err)
            
            db.run(`
              CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
              )`, (err) => {
              if (err) return reject(err)
              
              // 初始化设置
              db.run(`
                INSERT OR IGNORE INTO settings (key, value) 
                VALUES ('last_shipment_no', '310000')
              `, (err) => {
                if (err) return reject(err)
                resolve(db)
              })
            })
          })
        })
      })
    })
  })
}

// 客户操作
const customerDB = {
  // 添加客户
  add: async (customer) => {
    const db = await initDB()
    try {
      // 生成5位随机数字代码
      const code = Math.floor(10000 + Math.random() * 90000).toString()
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO customers (code, name, phone, address, frequent_site, payment_method, default_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            code, 
            customer.name, 
            customer.phone, 
            customer.address,
            customer.frequentSite,
            customer.paymentMethod,
            customer.defaultPrice
          ],
          function(err) {
            if (err) return reject(err)
            resolve(this.lastID)
          }
        )
      })
      return result
    } finally {
      db.close()
    }
  },

  // 更新客户信息
  update: async (id, customer) => {
    const db = await initDB()
    try {
      const changes = await new Promise((resolve, reject) => {
        db.run(
          'UPDATE customers SET name=?, phone=?, address=?, frequent_site=?, payment_method=?, default_price=? WHERE id=?',
          [
            customer.name,
            customer.phone,
            customer.address,
            customer.frequentSite,
            customer.paymentMethod,
            customer.defaultPrice,
            id
          ],
          function(err) {
            if (err) return reject(err)
            resolve(this.changes)
          }
        )
      })
      return changes
    } finally {
      db.close()
    }
  },

  // 批量删除客户
  batchDelete: async (ids) => {
    const db = await initDB()
    try {
      const placeholders = ids.map(() => '?').join(',')
      const changes = await new Promise((resolve, reject) => {
        db.run(
          `DELETE FROM customers WHERE id IN (${placeholders})`,
          ids,
          function(err) {
            if (err) return reject(err)
            resolve(this.changes)
          }
        )
      })
      return changes > 0
    } finally {
      db.close()
    }
  },

  // 删除单个客户
  delete: async (id) => {
    const db = await initDB()
    try {
      const changes = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM customers WHERE id=?',
          [id],
          function(err) {
            if (err) return reject(err)
            resolve(this.changes)
          }
        )
      })
      return changes
    } finally {
      db.close()
    }
  },

  // 获取客户数据(分页)
  getCustomers: async (page = 1, pageSize = 20) => {
    const db = await initDB()
    try {
      const offset = (page - 1) * pageSize
      const rows = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [pageSize, offset],
          (err, rows) => {
            if (err) return reject(err)
            resolve(rows)
          }
        )
      })
      return rows
    } finally {
      db.close()
    }
  },

  // 获取客户总数
  getCustomerCount: async () => {
    const db = await initDB()
    try {
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
          if (err) return reject(err)
          resolve(row)
        })
      })
      return row ? row.count : 0
    } finally {
      db.close()
    }
  }
}

// 发票操作
const invoiceDB = {
  // 获取最后生成的托运单号
  getLastShipmentNo: async () => {
    const db = await initDB()
    try {
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = "last_shipment_no"', (err, row) => {
          if (err) return reject(err)
          resolve(row)
        })
      })
      return row ? parseInt(row.value) : 310000
    } finally {
      db.close()
    }
  },

  // 更新最后生成的托运单号
  updateLastShipmentNo: async (no) => {
    const db = await initDB()
    try {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['last_shipment_no', no],
          function(err) {
            if (err) return reject(err)
            resolve()
          }
        )
      })
    } finally {
      db.close()
    }
  },

  // 创建发票
  create: async (invoice) => {
    const db = await initDB()
    try {
      // 确保settings表存在
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )`, (err) => {
          if (err) return reject(err)
          resolve()
        })
      })

      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO invoices (customer_id, shipment_no, amount, date) VALUES (?, ?, ?, ?)',
          [invoice.customerId, invoice.shipmentNo, invoice.amount, invoice.date],
          function(err) {
            if (err) return reject(err)
            resolve(this.lastID)
          }
        )
      })
      return result
    } finally {
      db.close()
    }
  }
}

module.exports = { initDB, customerDB, invoiceDB }

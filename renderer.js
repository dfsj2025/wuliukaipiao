const { ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')

// 页面导航
function navigate(page) {
  let title = ''
  if (page === 'customer') title = '客户管理'
  else if (page === 'invoice') title = '托运单管理'
  else if (page === 'invoice-query') title = '票据查询'
  else if (page === 'dictionary') title = '录入字典'
  document.getElementById('page-title').textContent = title
  
  // 清空内容区域
  const content = document.getElementById('page-content')
  content.innerHTML = ''

  // 根据页面加载不同内容
  if (page === 'customer') {
    loadCustomerPage(content)
    loadCustomers()
  } else if (page === 'invoice') {
    loadInvoicePage(content)
  } else if (page === 'invoice-query') {
    loadInvoiceQueryPage(content)
  } else if (page === 'dictionary') {
    loadDictionaryPage(content)
  }

}

// 录入字典页面
function loadDictionaryPage(container) {
  container.innerHTML = `
    <div class="mb-3">
      <h3>录入字典</h3>
      <div class="row row-cols-1 row-cols-md-2" style="gap:20px;">
        ${renderDictInputBlock('发货点', 'departureSites', 'newDepartureSite', 'addDepartureSiteBtn', 'departureSiteSelect', 'delDepartureSiteBtn')}
        ${renderDictInputBlock('到货点', 'arrivalSites', 'newArrivalSite', 'addArrivalSiteBtn', 'arrivalSiteSelect', 'delArrivalSiteBtn')}
        ${renderDictInputBlock('物品名', 'goodsNames', 'newGoodsName', 'addGoodsNameBtn', 'goodsNameSelect', 'delGoodsNameBtn')}
        ${renderDictInputBlock('单位', 'units', 'newUnit', 'addUnitBtn', 'unitSelect', 'delUnitBtn')}
        ${renderDictInputBlock('付款方式', 'paymentMethods', 'newPaymentMethod', 'addPaymentMethodBtn', 'paymentMethodSelect', 'delPaymentMethodBtn')}
        ${renderDictInputBlock('提货方式', 'deliveryMethods', 'newDeliveryMethod', 'addDeliveryMethodBtn', 'deliveryMethodSelect', 'delDeliveryMethodBtn')}
      </div>
    </div>
  `
// 渲染单个字典输入块
function renderDictInputBlock(label, dictKey, inputId, btnId, listId) {
  // 自定义下拉菜单结构，添加按钮始终在最右侧
  return `
    <div class="col position-relative mb-2">
      <h5>${label}</h5>
      <div class="input-group mb-2" style="display:flex;flex-wrap:nowrap;align-items:center;">
        <div style="position:relative;flex:1 1 auto;display:flex;align-items:center;min-width:300px;max-width:300px;">
          <input type="text" id="${inputId}" class="form-control dict-combo-input" placeholder="新增${label}" autocomplete="off" style="width:260px;min-width:260px;max-width:260px;">
          <button class="btn btn-outline-secondary dict-combo-toggle" type="button" data-key="${dictKey}" tabindex="-1" style="position:absolute;right:0;top:0;bottom:0;width:40px;z-index:2;">▼</button>
        </div>
        <button class="btn btn-primary ms-2" id="${btnId}" style="min-width:60px;">添加</button>
      </div>
      <div class="dict-combo-dropdown shadow" id="${dictKey}-dropdown" style="display:none; position:absolute; z-index:1000; background:#fff; min-width:300px; max-width:350px; max-height:180px; overflow-y:auto; border:1px solid #ccc; border-radius:4px;"></div>
    </div>
  `
}
  renderDictionaryLists()
  const dicts = [
    { key: 'departureSites', input: 'newDepartureSite', btn: 'addDepartureSiteBtn' },
    { key: 'arrivalSites', input: 'newArrivalSite', btn: 'addArrivalSiteBtn' },
    { key: 'goodsNames', input: 'newGoodsName', btn: 'addGoodsNameBtn' },
    { key: 'units', input: 'newUnit', btn: 'addUnitBtn' },
    { key: 'paymentMethods', input: 'newPaymentMethod', btn: 'addPaymentMethodBtn' },
    { key: 'deliveryMethods', input: 'newDeliveryMethod', btn: 'addDeliveryMethodBtn' }
  ]
  dicts.forEach(d => {
    // 添加按钮
    document.getElementById(d.btn).onclick = function() {
      const val = document.getElementById(d.input).value.trim()
      if (val) {
        let arr = getDictionary(d.key)
        if (!arr.includes(val)) arr.push(val)
        setDictionary(d.key, arr)
        document.getElementById(d.input).value = ''
        renderDictionaryLists()
      }
    }
    // 下拉按钮事件
    const toggleBtn = document.querySelector(`.dict-combo-toggle[data-key="${d.key}"]`)
    const dropdown = document.getElementById(`${d.key}-dropdown`)
    const input = document.getElementById(d.input)
    toggleBtn.onclick = function(e) {
      e.stopPropagation()
      renderDictionaryDropdown(d.key, input, dropdown)
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'
    }
    // 输入框获得焦点时关闭其他下拉
    input.addEventListener('focus', function() {
      document.querySelectorAll('.dict-combo-dropdown').forEach(dd => dd.style.display = 'none')
    })
    // 点击外部关闭下拉
    document.addEventListener('click', function hideDropdown(e) {
      if (!dropdown.contains(e.target) && e.target !== toggleBtn) {
        dropdown.style.display = 'none'
      }
    })
  })
}

function renderDictionaryLists() {
  const dictConfigs = [
    { key: 'departureSites', input: 'newDepartureSite' },
    { key: 'arrivalSites', input: 'newArrivalSite' },
    { key: 'goodsNames', input: 'newGoodsName' },
    { key: 'units', input: 'newUnit' },
    { key: 'paymentMethods', input: 'newPaymentMethod' },
    { key: 'deliveryMethods', input: 'newDeliveryMethod' }
  ]
  dictConfigs.forEach(cfg => {
    const input = document.getElementById(cfg.input)
    const dropdown = document.getElementById(`${cfg.key}-dropdown`)
    if (dropdown) {
      dropdown.style.display = 'none'
      dropdown.innerHTML = ''
    }
  })
}

// 渲染自定义下拉内容
function renderDictionaryDropdown(dictKey, input, dropdown) {
  const arr = getDictionary(dictKey)
  dropdown.innerHTML = arr.length === 0
    ? '<div class="px-3 py-2 text-muted">暂无词条</div>'
    : arr.map(item => `
      <div class="dict-combo-item px-2 py-1" style="display:flex;align-items:center;cursor:pointer;white-space:nowrap;width:100%;">
        <span class="dict-combo-text" style="flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item}</span>
        <div style="flex:0 0 auto;display:flex;justify-content:flex-end;width:32px;">
          <button class="btn btn-sm btn-link text-danger dict-combo-del" data-key="${dictKey}" data-value="${item}" title="删除" style="font-size:1.2em;padding:0 0 0 8px;margin:0;">×</button>
        </div>
      </div>
    `).join('')
  // 绑定选择和删除事件
  dropdown.querySelectorAll('.dict-combo-item').forEach(div => {
    div.onclick = function(e) {
      if (e.target.classList.contains('dict-combo-del')) return
      input.value = div.querySelector('.dict-combo-text').textContent
      dropdown.style.display = 'none'
    }
  })
  dropdown.querySelectorAll('.dict-combo-del').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation()
      const key = btn.getAttribute('data-key')
      const val = btn.getAttribute('data-value')
      if (confirm('确定要删除“' + val + '”吗？')) {
        let arr = getDictionary(key)
        arr = arr.filter(item => item !== val)
        setDictionary(key, arr)
        renderDictionaryLists()
        // 重新渲染下拉
        renderDictionaryDropdown(key, input, dropdown)
      }
    }
  })
}

function getDictionary(key) {
  try {
    return JSON.parse(localStorage.getItem('dictionary_' + key)) || []
  } catch {
    return []
  }
}
function setDictionary(key, arr) {
  localStorage.setItem('dictionary_' + key, JSON.stringify(arr))
}

// 加载客户管理页面
function loadCustomerPage(container) {
    container.innerHTML = `
    <div class="mb-3">
      <h3>添加新客户</h3>
      <div class="row g-3">
        <div class="col-md-2">
          <input type="text" id="customerName" class="form-control" placeholder="客户名称*" required>
        </div>
        <div class="col-md-2">
          <input type="text" id="customerPhone" class="form-control" placeholder="联系电话">
        </div>
        <div class="col-md-2">
          <input type="text" id="customerAddress" class="form-control" placeholder="客户地址">
        </div>
        <div class="col-md-2">
          <select id="frequentSite" class="form-select">
            <option value="">常在网点</option>
            <option value="网点A">网点A</option>
            <option value="网点B">网点B</option>
            <option value="网点C">网点C</option>
          </select>
        </div>
        <div class="col-md-2">
          <select id="paymentMethod" class="form-select">
            <option value="">付款方式</option>
            <option value="月结">月结</option>
            <option value="提付">提付</option>
            <option value="现付">现付</option>
            <option value="银行卡">银行卡</option>
          </select>
        </div>
        <div class="col-md-1">
          <input type="number" id="defaultPrice" class="form-control" placeholder="默认单价">
        </div>
        <div class="col-md-1">
          <button class="btn btn-primary" id="addCustomerBtn">添加</button>
        </div>
        <div class="col-md-1">
          <button class="btn btn-secondary" onclick="clearCustomerForm()">清空</button>
        </div>
      </div>
      <div class="row g-3 mt-2">
        <div class="col-md-2">
          <input type="text" id="receiver" class="form-control" placeholder="收件人">
        </div>
        <div class="col-md-2">
          <input type="text" id="receiverPhone" class="form-control" placeholder="收件电话">
        </div>
        <div class="col-md-3">
          <input type="text" id="receiverAddress" class="form-control" placeholder="收件地址">
        </div>
        <div class="col-md-2">
          <input type="text" id="receiverSite" class="form-control" placeholder="收件站点">
        </div>
        <div class="col-md-2">
          <input type="text" id="sender" class="form-control" placeholder="发件人">
        </div>
        <div class="col-md-2">
          <input type="text" id="senderPhone" class="form-control" placeholder="发件电话">
        </div>
        <div class="col-md-3">
          <input type="text" id="senderAddress" class="form-control" placeholder="发件地址">
        </div>
      </div>
    </div>
      <div class="mt-4">
      <div class="mb-2 d-flex justify-content-between align-items-center">
        <button class="btn btn-danger" id="batchDeleteBtn">批量删除</button>
        <div class="pagination-controls">
          <button class="btn btn-outline-primary" id="prevPage">上一页</button>
          <span class="mx-2" id="pageInfo">第1页</span>
          <button class="btn btn-outline-primary" id="nextPage">下一页</button>
        </div>
      </div>
      <h3>客户列表</h3>
      <table class="table table-striped">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAll"></th>
            <th class="sortable" data-sort="id">客户代码 <span class="sort-icon"></span></th>
            <th class="sortable" data-sort="name">客户名称 <span class="sort-icon"></span></th>
            <th class="sortable" data-sort="phone">联系电话 <span class="sort-icon"></span></th>
            <th>收件地址</th>
            <th class="sortable" data-sort="frequent_site">常在网点 <span class="sort-icon"></span></th>
            <th>付款方式</th>
            <th>默认单价</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="customerList">
          <!-- 客户列表将通过JS动态加载 -->
        </tbody>
      </table>
    </div>
  `
}

// 加载开票查询页面
function loadInvoiceQueryPage(container) {
  container.innerHTML = `
    <div class="mt-4">
      <h3>开票查询</h3>
      <div class="row g-3 mb-3">
        <div class="col-md-3">
          <input type="text" id="queryNo" class="form-control" placeholder="托运单号" onpaste="handlePaste(event)">
        </div>
        <div class="col-md-1">
          <button class="btn btn-outline-secondary" onclick="pasteFromClipboard()">
            <i class="bi bi-clipboard-plus"></i> 粘贴
          </button>
        </div>
        <div class="col-md-3">
          <input type="date" id="queryDate" class="form-control" placeholder="日期">
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary" onclick="queryInvoices()">查询</button>
        </div>
      </div>
      <style>
        #invoiceQueryList {
          font-family: monospace;
          display: grid;
          grid-gap: 40px;
          gap: 40px;
          justify-content: start;
        }
        #invoiceQueryList > div {
          margin: 0 !important;
          padding: 0 !important;
          width: 280px;
        }
        @media (min-width: 1400px) {
          #invoiceQueryList { 
            grid-template-columns: repeat(auto-fill, 280px);
            padding: 0 20px;
          }
        }
        @media (min-width: 1050px) and (max-width: 1399px) {
          #invoiceQueryList { 
            grid-template-columns: repeat(auto-fill, 280px);
            padding: 0 20px;
          }
        }
        @media (min-width: 700px) and (max-width: 1049px) {
          #invoiceQueryList { 
            grid-template-columns: repeat(auto-fill, 280px);
            padding: 0 20px;
          }
        }
        @media (max-width: 699px) {
          #invoiceQueryList { 
            grid-template-columns: 280px;
            padding: 0 20px;
          }
        }
      </style>
      <div id="invoiceQueryList">
        <!-- 托运单列表将通过JS动态加载 -->
      </div>
    </div>
  `
  loadInvoices()
}

// 加载托运单页面
function loadInvoicePage(container) {
  container.innerHTML = `
    <div class="mb-3">
      <h3>新建物流托运单</h3>
      <!-- 上部：发货点、收件人及相关信息 -->
      <fieldset class="border rounded p-3 mb-3">
        <legend class="w-auto px-2" style="font-size:1.1rem;">发货点及收件人信息</legend>
        <div class="row g-3 align-items-center">
          <div class="col-md-3">
            <label>选择客户</label>
            <select id="customerSelect" class="form-select mb-2">
              <option value="">选择客户</option>
            </select>
          </div>
          <div class="col-md-2">
            <label>托运单号</label>
            <input type="text" id="shipmentNo" class="form-control mb-2" placeholder="托运单号" readonly>
          </div>
          <div class="col-md-2">
            <label>托运日期</label>
            <input type="date" id="shipmentDate" class="form-control mb-2" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="col-md-2">
            <label>发货站点</label>
            <input type="text" id="departureSite" class="form-control mb-2" placeholder="发货站点">
          </div>
          <div class="col-md-3">
            <label class="text-danger">收件人</label>
            <input type="text" id="receiver" class="form-control mb-2" placeholder="收件人">
          </div>
          <div class="col-md-2">
            <label>收件电话</label>
            <input type="text" id="receiverPhone" class="form-control mb-2" placeholder="收件电话">
          </div>
          <div class="col-md-3">
            <label>收件地址</label>
            <input type="text" id="receiverAddress" class="form-control mb-2" placeholder="收件地址">
          </div>
          <div class="col-md-2">
            <label class="text-danger">收件站点</label>
            <input type="text" id="receiverSite" class="form-control mb-2" placeholder="收件站点">
          </div>
        </div>
      </fieldset>
      <!-- 中部：收货点、发件人及相关信息 -->
      <fieldset class="border rounded p-3 mb-3">
        <legend class="w-auto px-2" style="font-size:1.1rem;">收货点及发件人信息</legend>
        <div class="row g-3 align-items-center">
          <div class="col-md-3">
            <label>发件人</label>
            <input type="text" id="sender" class="form-control mb-2" placeholder="发件人">
          </div>
          <div class="col-md-2">
            <label>发件电话</label>
            <input type="text" id="senderPhone" class="form-control mb-2" placeholder="发件电话">
          </div>
          <div class="col-md-5">
            <label>发件地址</label>
            <input type="text" id="senderAddress" class="form-control mb-2" placeholder="发件地址">
          </div>
        </div>
      </fieldset>
      <!-- 下部：货物及费用信息 -->
      <fieldset class="border rounded p-3 mb-3">
        <legend class="w-auto px-2" style="font-size:1.1rem;">货物及费用信息</legend>
        <div class="row g-3 align-items-center">
          <div class="col-md-2">
            <label>货物名</label>
            <input type="text" id="goodsName" class="form-control mb-2" placeholder="货物名">
          </div>
          <div class="col-md-1">
            <label>件数</label>
            <input type="number" id="quantity" class="form-control mb-2" placeholder="件数">
          </div>
          <div class="col-md-1">
            <label>单价</label>
            <input type="number" id="unitPrice" class="form-control mb-2" placeholder="单价" value="0.00">
          </div>
          <div class="col-md-1">
            <label>中转费</label>
            <input type="number" id="transferFee" class="form-control mb-2" placeholder="中转费" value="0.00">
          </div>
          <div class="col-md-1">
            <label>保价费</label>
            <input type="number" id="insuranceFee" class="form-control mb-2" placeholder="保价费" value="0.00">
          </div>
          <div class="col-md-1">
            <label>代收款</label>
            <input type="number" id="collectionFee" class="form-control mb-2" placeholder="代收款" value="0.00">
          </div>
          <div class="col-md-1">
            <label>手续费</label>
            <input type="number" id="serviceFee" class="form-control mb-2" placeholder="手续费" value="0.00">
          </div>
          <div class="col-md-1">
            <label>运费</label>
            <input type="number" id="freight" class="form-control mb-2" placeholder="运费" value="0.00">
          </div>
          <div class="col-md-1">
            <label>合计</label>
            <input type="number" id="totalAmount" class="form-control mb-2" placeholder="合计" value="0.00">
          </div>
          <div class="col-md-2">
            <label>付款方式</label>
            <select id="paymentMethod" class="form-select mb-2">
              <option value="">选择付款方式</option>
              <option value="现金">现金</option>
              <option value="转账">转账</option>
              <option value="月结">月结</option>
            </select>
          </div>
          <div class="col-md-2">
            <label>提货方式</label>
            <select id="deliveryMethod" class="form-select mb-2">
              <option value="">选择提货方式</option>
              <option value="自提">自提</option>
              <option value="送货">送货</option>
            </select>
          </div>
          <div class="col-md-3">
            <label>备注</label>
            <input type="text" id="remarks" class="form-control mb-2" placeholder="备注">
          </div>
        </div>
        <div class="row mt-3">
          <div class="col text-end">
            <button class="btn btn-primary" onclick="createInvoice()">生成托运单</button>
          </div>
        </div>
      </fieldset>
    </div>
  `

  // 加载客户下拉框
  async function loadCustomerSelect() {
    try {
      const customers = await customerDB.getCustomers(1, 1000) // 获取前1000条客户数据
      const select = document.getElementById('customerSelect')
      select.innerHTML = '<option value="">选择客户</option>'
      customers.forEach(customer => {
        const option = document.createElement('option')
        option.value = customer.id
        option.textContent = customer.name
        select.appendChild(option)
      })
    } catch (err) {
      console.error('加载客户下拉框失败:', err)
    }
  }
  loadCustomerSelect()
  loadInvoices()
}

const { initDB, customerDB, invoiceDB } = require('./db')

// 添加客户
window.addCustomer = async function() {
  const name = document.getElementById('customerName').value
  const phone = document.getElementById('customerPhone').value
  const address = document.getElementById('customerAddress').value
  const frequentSite = document.getElementById('frequentSite').value
  const paymentMethod = document.getElementById('paymentMethod').value
  const defaultPrice = parseFloat(document.getElementById('defaultPrice').value) || 0
  const receiver = document.getElementById('receiver').value
  const receiverPhone = document.getElementById('receiverPhone').value
  const receiverAddress = document.getElementById('receiverAddress').value
  const receiverSite = document.getElementById('receiverSite').value
  const sender = document.getElementById('sender').value
  const senderPhone = document.getElementById('senderPhone').value
  const senderAddress = document.getElementById('senderAddress').value

  if (!name) {
    alert('请输入客户名称')
    return
  }

  try {
    await customerDB.add({
      name,
      phone,
      address,
      frequentSite,
      paymentMethod,
      defaultPrice,
      receiver,
      receiverPhone,
      receiverAddress,
      receiverSite,
      sender,
      senderPhone,
      senderAddress
    })

    alert('客户添加成功')
    window.clearCustomerForm()
    await loadCustomers()
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      alert('客户名称已存在，请使用不同的名称')
    } else {
      alert('添加客户失败: ' + err.message)
    }
  }
}

// 编辑客户
window.editCustomer = function(id) {
  // 获取当前客户数据
  const row = document.querySelector(`tr[data-id="${id}"]`)
  const name = row.querySelector('.customer-name').textContent
  const phone = row.querySelector('.customer-phone').textContent
  const address = row.querySelector('.customer-address').textContent
  const frequentSite = row.querySelector('.customer-site').textContent
  const paymentMethod = row.querySelector('.customer-payment').textContent
  const defaultPrice = row.querySelector('.customer-price').textContent
  // 新增字段
  const receiver = row.getAttribute('data-receiver') || ''
  const receiverPhone = row.getAttribute('data-receiver-phone') || ''
  const receiverAddress = row.getAttribute('data-receiver-address') || ''
  const receiverSite = row.getAttribute('data-receiver-site') || ''
  const sender = row.getAttribute('data-sender') || ''
  const senderPhone = row.getAttribute('data-sender-phone') || ''
  const senderAddress = row.getAttribute('data-sender-address') || ''

  // 填充表单
  document.getElementById('customerName').value = name
  document.getElementById('customerPhone').value = phone
  document.getElementById('customerAddress').value = address
  document.getElementById('frequentSite').value = frequentSite
  document.getElementById('paymentMethod').value = paymentMethod
  document.getElementById('defaultPrice').value = defaultPrice
  document.getElementById('receiver').value = receiver
  document.getElementById('receiverPhone').value = receiverPhone
  document.getElementById('receiverAddress').value = receiverAddress
  document.getElementById('receiverSite').value = receiverSite
  document.getElementById('sender').value = sender
  document.getElementById('senderPhone').value = senderPhone
  document.getElementById('senderAddress').value = senderAddress

  // 修改按钮为更新按钮
  const addBtn = document.getElementById('addCustomerBtn')
  addBtn.textContent = '更新'
  addBtn.setAttribute('data-action', 'update')
  addBtn.setAttribute('data-id', id)
}

// 清空客户表单
window.clearCustomerForm = function() {
  document.getElementById('customerName').value = ''
  document.getElementById('customerPhone').value = ''
  document.getElementById('customerAddress').value = ''
  document.getElementById('frequentSite').value = ''
  document.getElementById('paymentMethod').value = ''
  document.getElementById('defaultPrice').value = ''
  document.getElementById('receiver').value = ''
  document.getElementById('receiverPhone').value = ''
  document.getElementById('receiverAddress').value = ''
  document.getElementById('receiverSite').value = ''
  document.getElementById('sender').value = ''
  document.getElementById('senderPhone').value = ''
  document.getElementById('senderAddress').value = ''

  const addBtn = document.getElementById('addCustomerBtn')
  addBtn.textContent = '添加'
  addBtn.removeAttribute('data-action')
  addBtn.removeAttribute('data-id')
}

// 更新客户
window.updateCustomer = async function(id) {
  const customer = {
    name: document.getElementById('customerName').value,
    phone: document.getElementById('customerPhone').value,
    address: document.getElementById('customerAddress').value,
    frequentSite: document.getElementById('frequentSite').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    defaultPrice: parseFloat(document.getElementById('defaultPrice').value) || 0
  }

  try {
    console.log('Updating customer ID:', id, 'with data:', customer)
    console.log('Calling customerDB.update with:', id, customer)
    const changes = await customerDB.update(id, customer)
    console.log('Update result - changes:', changes, 'type:', typeof changes)
    if (changes > 0) {
      alert('客户信息已更新')
      // 重置表单
      document.getElementById('customerName').value = ''
      document.getElementById('customerPhone').value = ''
      document.getElementById('customerAddress').value = ''
      document.getElementById('frequentSite').value = ''
      document.getElementById('paymentMethod').value = ''
      document.getElementById('defaultPrice').value = ''
  // 恢复按钮状态
  const addBtn = document.getElementById('addCustomerBtn')
  addBtn.textContent = '添加'
  addBtn.removeAttribute('data-action')
  addBtn.removeAttribute('data-id')
      // 强制刷新列表
      document.getElementById('customerList').innerHTML = ''
      await loadCustomers()
      console.log('Customers reloaded after update')
    } else {
      alert('未找到要更新的客户')
    }
  } catch (err) {
    alert('更新客户失败: ' + err.message)
  }
}

// 删除客户
window.deleteCustomer = async function(id) {
  if (!confirm('确定要删除这个客户吗？')) return
  
  try {
    const changes = await customerDB.delete(id)
    if (changes > 0) {
      alert('客户已删除')
      // 重置表单
      document.getElementById('customerName').value = ''
      document.getElementById('customerPhone').value = ''
      document.getElementById('customerAddress').value = ''
      document.getElementById('frequentSite').value = ''
      document.getElementById('paymentMethod').value = ''
      document.getElementById('defaultPrice').value = ''
      // 恢复按钮状态
      const addBtn = document.getElementById('addCustomerBtn')
      addBtn.textContent = '添加'
      addBtn.onclick = window.addCustomer
      // 刷新列表
      await loadCustomers()
    } else {
      alert('未找到要删除的客户')
    }
  } catch (err) {
    alert('删除客户失败: ' + err.message)
  }
}

// 分页状态
let pagination = {
  currentPage: 1,
  pageSize: 20,
  totalCount: 0
}

// 更新分页UI
function updatePaginationUI() {
  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize)
  document.getElementById('pageInfo').textContent = 
    `第 ${pagination.currentPage} 页，共 ${totalPages} 页`
  document.getElementById('prevPage').disabled = pagination.currentPage <= 1
  document.getElementById('nextPage').disabled = 
    pagination.currentPage >= totalPages
}

// 排序状态
let sortState = {
  field: 'id',
  direction: 'asc'
}

// 处理表头排序点击
function handleSortClick(e) {
  if (e.target.classList.contains('sortable') || 
      e.target.parentElement.classList.contains('sortable')) {
    const th = e.target.classList.contains('sortable') ? e.target : e.target.parentElement
    const field = th.getAttribute('data-sort')
    
    // 更新排序状态
    if (sortState.field === field) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
    } else {
      sortState.field = field
      sortState.direction = 'asc'
    }
    
    // 更新排序图标
    document.querySelectorAll('.sortable').forEach(el => {
      el.querySelector('.sort-icon').textContent = ''
    })
    th.querySelector('.sort-icon').textContent = 
      sortState.direction === 'asc' ? '↑' : '↓'
    
    // 重新加载客户列表
    loadCustomers()
  }
}

// 加载客户列表
async function loadCustomers() {
  const tbody = document.getElementById('customerList')
  try {
    // 获取分页数据
    const [customers, totalCount] = await Promise.all([
      customerDB.getCustomers(pagination.currentPage, pagination.pageSize),
      customerDB.getCustomerCount()
    ])
    pagination.totalCount = totalCount
    
    // 更新分页UI
    updatePaginationUI()
    
    // 排序处理
    customers.sort((a, b) => {
      const field = sortState.field
      const valA = a[field] || ''
      const valB = b[field] || ''
      
      if (valA < valB) return sortState.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortState.direction === 'asc' ? 1 : -1
      return 0
    })
    tbody.innerHTML = customers.map(customer => `
      <tr data-id="${customer.id}">
        <td><input type="checkbox" class="customer-checkbox" data-id="${customer.id}"></td>
        <td>${customer.id}</td>
        <td class="customer-name">${customer.name}</td>
        <td class="customer-phone">${customer.phone || '-'}</td>
        <td class="customer-address">${customer.address || '-'}</td>
        <td class="customer-site">${customer.frequent_site || '-'}</td>
        <td class="customer-payment">${customer.payment_method || '-'}</td>
        <td class="customer-price">${customer.default_price || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary me-2 edit-btn" data-id="${customer.id}">编辑</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${customer.id}">删除</button>
        </td>
      </tr>
    `).join('')
  } catch (err) {
    alert('获取客户列表失败: ' + err.message)
  }
}

// 生成托运单号
async function generateShipmentNo() {
  const today = new Date().toISOString().split('T')[0]
  const lastNo = await invoiceDB.getLastShipmentNo()
  const lastDate = localStorage.getItem('lastShipmentDate')
  
  let newNo
  if (lastDate === today) {
    newNo = lastNo // 同一天不递增
  } else {
    newNo = lastNo + 1 // 新的一天递增1
  }
  
  await invoiceDB.updateLastShipmentNo(newNo)
  localStorage.setItem('lastShipmentDate', today)
  return newNo.toString().padStart(6, '0')
}

// 创建托运单
window.createInvoice = async function() {
  const customerId = document.getElementById('customerSelect').value
  const shipmentDate = document.getElementById('shipmentDate').value
  const shipmentWeight = document.getElementById('shipmentWeight').value
  const shipmentDestination = document.getElementById('shipmentDestination').value

  if (!customerId || !shipmentDate || !shipmentWeight || !shipmentDestination) {
    alert('请填写完整托运单信息')
    return
  }

  try {
    const shipmentNo = await generateShipmentNo()
    document.getElementById('shipmentNo').value = shipmentNo
    
    await invoiceDB.create({
      customerId,
      shipmentNo,
      amount: parseFloat(shipmentWeight) * 10, // 假设单价是10元/kg
      date: shipmentDate
    })

    alert(`托运单创建成功，单号: ${shipmentNo}`)
    document.getElementById('shipmentWeight').value = ''
    document.getElementById('shipmentDestination').value = ''
    await loadInvoices() // 刷新票列表
  } catch (err) {
    alert('创建托运单失败: ' + err.message)
  }
}

// 查询托运单
window.queryInvoices = async function() {
  const queryNo = document.getElementById('queryNo').value
  const queryDate = document.getElementById('queryDate').value
  
  let sql = `
    SELECT i.*, c.name as customer_name 
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
  `
  const params = []
  
  if (queryNo) {
    sql += ' WHERE i.shipment_no = ?'
    params.push(queryNo)
  }
  
  if (queryDate && !queryNo) {
    sql += ' WHERE i.date = ?'
    params.push(queryDate)
  } else if (queryDate) {
    sql += ' AND i.date = ?'
    params.push(queryDate)
  }
  
  sql += ' ORDER BY i.created_at DESC'
  
  try {
    const db = await initDB()
    const invoices = await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
    db.close()
    
    const invoiceList = document.getElementById('invoiceQueryList')
    if (invoiceList) {
      invoiceList.innerHTML = invoices.map(invoice => `
        <div class="mb-4" style="width: 280px; gap: 25px;">
          <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
            <div class="fw-bold">托运单号: ${invoice.shipment_no}</div>
            <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${invoice.shipment_no}')">
              <i class="bi bi-clipboard"></i> 复制
            </button>
          </div>
          <div class="p-3 border rounded" style="background: white; font-family: monospace;">
            <div class="text-center fw-bold mb-2">同城物流托运单</div>
            <div class="d-flex justify-content-between align-items-center mb-1 px-2" 
                 style="background:#fff !important;
                        min-height:45px !important;">
              <canvas id="barcode-${invoice.shipment_no}" style="height:45px !important; width:160px !important; margin-right: 10px;"></canvas>
              <canvas id="qrcode-${invoice.shipment_no}" style="height:45px !important; width:45px !important;"></canvas>
            </div>
            <div class="d-flex fw-bold" style="font-size: 1.2rem;">
              <span>单号: ${invoice.shipment_no}</span>
            </div>
            <div class="my-1" style="border-bottom: 1px dashed #666; width: 75%;"></div>
            <div class="text-start" style="margin-bottom: 0.20rem;">请保留此小票，以便查询！</div>
            <div class="text-start" style="margin-bottom: 0.15rem;">客服电话：18971176766</div>
            <div class="text-start" style="margin-bottom: 0.15rem;">开单日期：${new Date(invoice.created_at).toLocaleString()}</div>
            <div class="my-1" style="border-bottom: 2px dashed #666; width: 85%;"></div>
            <div class="d-flex justify-content-between">
              <span>发货站点:</span>
              <span>${invoice.departure_site || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-danger">收件人:</span>
              <span>${invoice.receiver || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>收件电话:</span>
              <span>${invoice.receiver_phone || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>收件地址:</span>
              <span>${invoice.receiver_address || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-danger">收件站点:</span>
              <span>${invoice.receiver_site || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>发件人:</span>
              <span>${invoice.sender || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>发件电话:</span>
              <span>${invoice.sender_phone || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>发件地址:</span>
              <span>${invoice.sender_address || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>货物名:</span>
              <span>${invoice.goods_name || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>件数:</span>
              <span>${invoice.quantity || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>中转费:</span>
              <span>¥${invoice.transfer_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>单价:</span>
              <span>¥${invoice.unit_price?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>运费:</span>
              <span>¥${invoice.freight?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>保价费:</span>
              <span>¥${invoice.insurance_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>代收款:</span>
              <span>¥${invoice.collection_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>手续费:</span>
              <span>¥${invoice.service_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>合计¥:</span>
              <span>¥${invoice.total_amount?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>付款方式:</span>
              <span>${invoice.payment_method || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>提货方式:</span>
              <span>${invoice.delivery_method || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>备注:</span>
              <span>${invoice.remarks || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>开单日期:</span>
              <span>${invoice.date || '-'}</span>
            </div>
            <div class="text-center mt-2">-------------------</div>
          </div>
        </div>
      `).join('')
    }
    generateBarcodes()
  } catch (err) {
    console.error('查询托运单失败:', err)
    alert('查询托运单失败: ' + err.message)
  }
}

async function loadInvoices() {
  let invoices = []
  try {
    const db = await initDB()
    try {
      invoices = await new Promise((resolve, reject) => {
        db.all(`
          SELECT i.*, c.name as customer_name 
          FROM invoices i
          LEFT JOIN customers c ON i.customer_id = c.id
          ORDER BY i.created_at DESC
          LIMIT 10
        `, (err, rows) => {
          if (err) return reject(err)
          resolve(rows)
        })
      })
    } finally {
      db.close()
    }
    
    const invoiceList = document.getElementById('invoiceQueryList') || document.getElementById('invoiceList')
    if (invoiceList) {
      invoiceList.innerHTML = invoices.map(invoice => `
      <div class="mb-4" style="width: 240px;">
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
          <div class="fw-bold">托运单号: ${invoice.shipment_no}</div>
          <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${invoice.shipment_no}')">
            <i class="bi bi-clipboard"></i> 复制
          </button>
        </div>
        <div class="p-3 border rounded" style="background: white; font-family: monospace; width: 280px; letter-spacing: 1px; padding: 12px;">
        <div class="text-center fw-bold mb-2">同城物流托运单</div>
            <div class="d-flex align-items-center mb-2" 
                 style="background:#fff !important;
                        min-height:45px !important;
                        visibility:visible !important;
                        display:flex !important;
                        justify-content: space-between !important;">
              <canvas id="barcode-${invoice.shipment_no}" style="height:45px !important; width:160px !important;"></canvas>
              <canvas id="qrcode-${invoice.shipment_no}" style="height:45px !important; width:45px !important;"></canvas>
            </div>
        <div class="d-flex fw-bold" style="font-size: 1.1rem; margin-bottom: 8px;">
          <span>单号: ${invoice.shipment_no}</span>
        </div>
            <div class="my-1" style="border-bottom: 1px dashed #666; width: 75%;"></div>
            <div class="text-start" style="margin: 0.0625rem 0; line-height: 1;">请保留此小票，以便查询！</div>
            <div class="text-start" style="margin: 0.0625rem 0; line-height: 1;">客服电话：18971176766</div>
            <div class="text-start" style="margin: 0.03125rem 0; line-height: 0.8; letter-spacing: -1px;">开单日期：${new Date(invoice.created_at).toLocaleString()}</div>
            <div class="my-1" style="border-bottom: 1px dashed #666; width: 75%;"></div>
            <div class="d-flex justify-content-between">
              <span>发货站点:</span>
              <span>${invoice.departure_site || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-danger">收件人:</span>
              <span>${invoice.receiver || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>收件电话:</span>
              <span>${invoice.receiver_phone || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>收件地址:</span>
              <span>${invoice.receiver_address || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-danger">收件站点:</span>
              <span>${invoice.receiver_site || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>发件人:</span>
              <span>${invoice.sender || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>发件电话:</span>
              <span>${invoice.sender_phone || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>发件地址:</span>
              <span>${invoice.sender_address || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>货物名:</span>
              <span>${invoice.goods_name || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>件数:</span>
              <span>${invoice.quantity || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>中转费:</span>
              <span>¥${invoice.transfer_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>单价:</span>
              <span>¥${invoice.unit_price?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>运费:</span>
              <span>¥${invoice.freight?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>保价费:</span>
              <span>¥${invoice.insurance_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>代收款:</span>
              <span>¥${invoice.collection_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>手续费:</span>
              <span>¥${invoice.service_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>合计¥:</span>
              <span>¥${invoice.total_amount?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>付款方式:</span>
              <span>${invoice.payment_method || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>提货方式:</span>
              <span>${invoice.delivery_method || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>备注:</span>
              <span>${invoice.remarks || '-'}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>开单日期:</span>
              <span>${invoice.date || '-'}</span>
            </div>
        <div class="text-center mt-2">-------------------</div>
        </div>
      </div>
    `).join('')
    }
    generateBarcodes()
  } catch (err) {
    console.error('加载托运单失败:', err)
  }
}

// 处理粘贴事件
function handlePaste(e) {
  const pastedText = (e.clipboardData || window.clipboardData).getData('text')
  document.getElementById('queryNo').value = pastedText
  e.preventDefault()
}

// 从剪贴板粘贴
function pasteFromClipboard() {
  const { clipboard } = require('electron')
  const text = clipboard.readText()
  if (text) {
    document.getElementById('queryNo').value = text
  } else {
    alert('剪贴板中没有文本内容')
  }
}

// 复制到剪贴板
function copyToClipboard(text) {
  const { clipboard } = require('electron')
  clipboard.writeText(text)
  alert('已复制单号: ' + text)
}

// 批量删除客户
window.batchDeleteCustomers = async function() {
  console.log('开始执行批量删除')
  const checkboxes = document.querySelectorAll('.customer-checkbox:checked')
  if (checkboxes.length === 0) {
    alert('请至少选择一个客户')
    return
  }

  if (!confirm(`确定要删除这${checkboxes.length}个客户吗？`)) return

  const ids = Array.from(checkboxes).map(checkbox => parseInt(checkbox.getAttribute('data-id')))
  
  try {
    const success = await customerDB.batchDelete(ids)
    if (success) {
      alert(`成功删除${checkboxes.length}个客户`)
      await loadCustomers()
    } else {
      alert('删除客户失败')
    }
  } catch (err) {
    alert('批量删除失败: ' + err.message)
  }
}

// 生成条形码和二维码
function generateBarcodes() {
  // 强制设置canvas尺寸
  document.querySelectorAll('canvas[id^="barcode-"]').forEach(canvas => {
    canvas.style.height = '45px !important'
    canvas.style.width = '160px !important'
    const id = canvas.id.replace('barcode-', '')
    try {
        JsBarcode(canvas, id, {
        format: 'CODE128',
        lineColor: '#000',
        width: 1.5,
        height: 45,
        displayValue: false,
        margin: 0
      })
    } catch (err) {
      console.error('生成条形码失败:', err)
    }
  })

  document.querySelectorAll('canvas[id^="qrcode-"]').forEach(canvas => {
    canvas.style.height = '45px'
    canvas.style.width = '45px'
    const id = canvas.id.replace('qrcode-', '')
    try {
      QRCode.toCanvas(canvas, id, {
        width: 45,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
    } catch (err) {
      console.error('生成二维码失败:', err)
    }
  })
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
  // 默认加载客户管理页面
  navigate('customer')
  loadCustomers()
  
  // 监听菜单导航
  ipcRenderer.on('navigate', (event, page) => {
    navigate(page)
    if (page === 'customer') {
      loadCustomers()
      // 确保按钮状态正确
      const addBtn = document.getElementById('addCustomerBtn')
      if (addBtn) {
        addBtn.textContent = '添加'
        addBtn.removeAttribute('data-action')
        addBtn.removeAttribute('data-id')
      }
    }
  })

  // 统一事件委托处理所有按钮点击
  function handleGlobalClick(e) {
    if (e.target.id === 'addCustomerBtn') {
      const action = e.target.getAttribute('data-action')
      if (action === 'update') {
        const id = parseInt(e.target.getAttribute('data-id'))
        updateCustomer(id)
      } else {
        window.addCustomer()
      }
    } else if (e.target.classList.contains('edit-btn')) {
      const id = parseInt(e.target.getAttribute('data-id'))
      editCustomer(id)
    } else if (e.target.classList.contains('delete-btn')) {
      const id = parseInt(e.target.getAttribute('data-id'))
      deleteCustomer(id)
    }
  }
  
  // 全选/取消全选功能
  document.getElementById('selectAll').addEventListener('change', function(e) {
    const checkboxes = document.querySelectorAll('.customer-checkbox')
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked
    })
  })

  // 批量删除按钮事件
  document.getElementById('batchDeleteBtn').addEventListener('click', function() {
    console.log('批量删除按钮被点击')
    window.batchDeleteCustomers()
  })

  // 绑定表头排序点击事件
  document.querySelector('thead').addEventListener('click', handleSortClick)

  // 确保只绑定一次全局点击事件
  document.removeEventListener('click', handleGlobalClick)
  document.addEventListener('click', handleGlobalClick)

  // 分页按钮事件
  document.getElementById('prevPage').addEventListener('click', () => {
    if (pagination.currentPage > 1) {
      pagination.currentPage--
      loadCustomers()
    }
  })

  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize)
    if (pagination.currentPage < totalPages) {
      pagination.currentPage++
      loadCustomers()
    }
  })
})

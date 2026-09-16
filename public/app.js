/**
 * LifeOS Web Chat Application Client Script
 * Companion Chat Focus with Personalized Nickname Onboarding.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    nickname: '',
    userUid: '',
    messages: []
  };

  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userStatus = document.getElementById('userStatus');
  const changeNameBtn = document.getElementById('changeNameBtn');

  const welcomeCard = document.getElementById('welcomeCard');
  const nameEntryForm = document.getElementById('nameEntryForm');
  const nicknameInput = document.getElementById('nicknameInput');
  const messagesContainer = document.getElementById('messagesContainer');
  
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');

  // ==========================================================================
  // 1. Initialize Application & Local Storage
  // ==========================================================================
  function init() {
    loadUserFromStorage();
    setupEventListeners();
    setupTextareaAutoResize();
  }

  function loadUserFromStorage() {
    const savedNickname = localStorage.getItem('lifeos_nickname');
    const savedUid = localStorage.getItem('lifeos_user_uid');

    if (savedNickname && savedUid) {
      state.nickname = savedNickname;
      state.userUid = savedUid;
      updateUserUI();
      if (welcomeCard) welcomeCard.style.display = 'none';
      
      // Auto-greeting if chat is fresh
      if (messagesContainer.children.length === 0) {
        appendMessage('ai', `สวัสดีครับคุณ **${state.nickname}**... วันนี้มีเรื่องอะไรในหัวที่อยากเล่าให้ฟังไหมครับ?`);
      }
    } else {
      // Create new unique User UID
      state.userUid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      localStorage.setItem('lifeos_user_uid', state.userUid);
      if (welcomeCard) welcomeCard.style.display = 'block';
    }
  }

  function updateUserUI() {
    if (state.nickname) {
      userName.textContent = state.nickname;
      userStatus.textContent = 'พร้อมรับฟังคุณเสมอ';
      userAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${state.nickname}`;
    } else {
      userName.textContent = 'ผู้เยี่ยมชม';
      userStatus.textContent = 'ระบุชื่อเล่นเพื่อเริ่มคุย';
      userAvatar.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=guest';
    }
  }

  // ==========================================================================
  // 2. Nickname Onboarding Handlers
  // ==========================================================================
  function handleNameSubmit(e) {
    e.preventDefault();
    const inputName = nicknameInput.value.trim();
    if (!inputName) return;

    state.nickname = inputName;
    localStorage.setItem('lifeos_nickname', state.nickname);
    updateUserUI();

    // Hide welcome card with animation
    welcomeCard.style.animation = 'fadeIn 0.3s reverse forwards';
    setTimeout(() => {
      welcomeCard.style.display = 'none';
      messagesContainer.innerHTML = '';
      
      // Send first initial companion welcome greeting
      appendMessage('ai', `สวัสดีครับคุณ **${state.nickname}**... ยินดีที่ได้พบกันนะครับ 

ที่นี่คือพื้นที่ปลอดภัยของคุณ วันนี้มีเรื่องอะไรในหัว หรือความรู้สึกแบบไหนที่อยากเล่าให้ฟังไหมครับ?`);
    }, 300);
  }

  function handleChangeName() {
    const newName = prompt('ระบุชื่อเล่นใหม่ที่คุณต้องการให้ LifeOS เรียก:', state.nickname || '');
    if (newName && newName.trim() !== '') {
      state.nickname = newName.trim();
      localStorage.setItem('lifeos_nickname', state.nickname);
      updateUserUI();
      appendMessage('ai', `รับทราบครับ! จากนี้ไปผมจะเรียกคุณว่าคุณ **${state.nickname}** นะครับ`);
    }
  }

  // ==========================================================================
  // 3. Event Listeners & Chat Logic
  // ==========================================================================
  function setupEventListeners() {
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    if (sidebarToggleChat) sidebarToggleChat.addEventListener('click', () => sidebar.classList.toggle('open'));
    if (sidebarToggleFinance) sidebarToggleFinance.addEventListener('click', () => sidebar.classList.toggle('open'));

    if (nameEntryForm) nameEntryForm.addEventListener('submit', handleNameSubmit);
    if (changeNameBtn) changeNameBtn.addEventListener('click', handleChangeName);

    if (userInput) {
      userInput.addEventListener('input', () => {
        if (sendBtn) sendBtn.disabled = userInput.value.trim() === '';
      });

      userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);
    if (clearChatBtn) clearChatBtn.addEventListener('click', clearChatHistory);
  }

  function setupTextareaAutoResize() {
    if (userInput) {
      userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      });
    }
  }

  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Ensure user has set a nickname
    if (!state.nickname) {
      if (welcomeCard) welcomeCard.style.display = 'block';
      nicknameInput.focus();
      return;
    }

    // Reset input state
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Hide welcome card if visible
    if (welcomeCard) welcomeCard.style.display = 'none';

    // Render User Message Bubble
    appendMessage('user', text);

    // Render AI Typing Indicator
    const typingElement = appendTypingIndicator();

    try {
      // Call Backend REST Endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userUid: state.userUid,
          userName: state.nickname
        })
      });

      const data = await response.json();
      
      // Remove Typing Indicator
      typingElement.remove();

      if (data.reply) {
        appendMessage('ai', data.reply);
      } else {
        appendMessage('ai', 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      }

    } catch (error) {
      console.error('Chat API Error:', error);
      typingElement.remove();
      appendMessage('ai', 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Server');
    }
  }

  function appendMessage(role, text) {
    const isUser = role === 'user';
    const messageRow = document.createElement('div');
    messageRow.className = `message-row ${isUser ? 'user-row' : 'ai-row'}`;

    const avatarSrc = isUser
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${state.nickname || 'guest'}`
      : null;

    const avatarHtml = isUser
      ? `<img src="${avatarSrc}" class="msg-avatar" alt="Avatar">`
      : `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>`;

    const formattedText = formatMarkdownText(text);

    messageRow.innerHTML = `
      ${avatarHtml}
      <div class="msg-bubble">${formattedText}</div>
    `;

    messagesContainer.appendChild(messageRow);
    scrollToBottom();

    return messageRow;
  }

  function appendTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="msg-bubble">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(row);
    scrollToBottom();
    return row;
  }

  function formatMarkdownText(text) {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function scrollToBottom() {
    const chatFeed = document.getElementById('chatFeed');
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function startNewChat() {
    messagesContainer.innerHTML = '';
    if (state.nickname) {
      appendMessage('ai', `สวัสดีครับคุณ **${state.nickname}**... วันนี้มีเรื่องอะไรในหัวที่อยากเล่าให้ฟังไหมครับ?`);
    } else {
      if (welcomeCard) welcomeCard.style.display = 'block';
    }
  }

  function clearChatHistory() {
    if (confirm('คุณต้องการล้างบทสนทนาในหน้านี้ใช่หรือไม่?')) {
      startNewChat();
    }
  }

  // ==========================================================================
  // 4. Financial Simulation Engine & Dashboard Logic
  // ==========================================================================

  // Default Simulation Parameters
  const defaultParams = {
    fundAInit: 500000,
    fundAYield: 10, // % per year
    fundADeposit: 30000, // oct 26 - apr 27
    fundATransfer: 200000, // chunk to transfer when B is depleted
    reserveBInit: 300000,
    incomePhase1: 95000, // oct 26 - apr 27
    incomePhase2: 10000, // may 27 onwards
    expPhase1: 60000, // oct 26 - dec 28
    expPhase2: 15000, // jan 29 onwards
    condoGross: 4000000, // gross sale price
    condoDebt: 1000000, // bank mortgage debt
    condoMonth: 12, // sale month
    condoYear: 2028, // sale year
    condoDest: 'fundA', // 'fundA' | 'reserveB'
    pfAmount: 2700000, // payout amount
    pfMonth: 1, // payout month
    pfYear: 2032, // payout year
    pfDest: 'pf', // 'pf' | 'fundA' | 'reserveB'
    fundAWithdrawYear: 2030, // year to transfer from Fund A into Reserve B
    fundAWithdrawAmount: 0, // amount to transfer from Fund A into Reserve B
    yearlyOverrides: {} // { 2030: { income: 25000, expense: 20000 } }
  };

  // Mutable Simulation Parameters State
  const params = { ...defaultParams };

  // Dashboard State
  const financeState = {
    period: '2026-2050',
    startYear: 2026,
    endYear: 2050,
    viewMode: 'monthly', // 'monthly' | 'yearly'
    chartInstance: null,
    fullMonthlyData: [],
    filteredData: []
  };

  // DOM Elements for Financial Dashboard
  const navChatBtn = document.getElementById('navChatBtn');
  const navFinanceBtn = document.getElementById('navFinanceBtn');
  const chatViewport = document.getElementById('chatViewport');
  const financeViewport = document.getElementById('financeViewport');
  const sidebarContentChat = document.getElementById('sidebarContentChat');
  const sidebarContentFinance = document.getElementById('sidebarContentFinance');
  const sidebarToggleChat = document.getElementById('sidebarToggleChat');
  const sidebarToggleFinance = document.getElementById('sidebarToggleFinance');

  const toggleTuneBtn = document.getElementById('toggleTuneBtn');
  const tuningDrawer = document.getElementById('tuningDrawer');
  const resetParamsBtn = document.getElementById('resetParamsBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  const periodBtnGroup = document.getElementById('periodBtnGroup');
  const customRangeBox = document.getElementById('customRangeBox');
  const startYearSlider = document.getElementById('startYearSlider');
  const endYearSlider = document.getElementById('endYearSlider');
  const startYearDisp = document.getElementById('startYearDisp');
  const endYearDisp = document.getElementById('endYearDisp');

  const chartViewMonthly = document.getElementById('chartViewMonthly');
  const chartViewYearly = document.getElementById('chartViewYearly');
  const financeChartCanvas = document.getElementById('financeChart');

  const financeTableBody = document.getElementById('financeTableBody');
  const tableRecordCount = document.getElementById('tableRecordCount');
  const sideYieldVal = document.getElementById('sideYieldVal');

  // Input Parameter Elements
  const paramFundAInit = document.getElementById('paramFundAInit');
  const paramFundAYield = document.getElementById('paramFundAYield');
  const paramFundADeposit = document.getElementById('paramFundADeposit');
  const paramFundATransfer = document.getElementById('paramFundATransfer');
  const paramReserveBInit = document.getElementById('paramReserveBInit');
  const paramIncomePhase1 = document.getElementById('paramIncomePhase1');
  const paramIncomePhase2 = document.getElementById('paramIncomePhase2');
  const paramExpPhase1 = document.getElementById('paramExpPhase1');
  const paramExpPhase2 = document.getElementById('paramExpPhase2');
  const paramCondoGross = document.getElementById('paramCondoGross');
  const paramCondoDebt = document.getElementById('paramCondoDebt');
  const paramCondoMonth = document.getElementById('paramCondoMonth');
  const paramCondoYear = document.getElementById('paramCondoYear');
  const paramCondoDest = document.getElementById('paramCondoDest');
  const paramPFAmount = document.getElementById('paramPFAmount');
  const paramPFMonth = document.getElementById('paramPFMonth');
  const paramPFYear = document.getElementById('paramPFYear');
  const paramPFDest = document.getElementById('paramPFDest');

  // Setup Navigation View Switching
  function setupNavigation() {
    if (navChatBtn && navFinanceBtn) {
      navChatBtn.addEventListener('click', () => switchView('chatViewport'));
      navFinanceBtn.addEventListener('click', () => switchView('financeViewport'));
    }
    if (sidebarToggleFinance) {
      sidebarToggleFinance.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
  }

  function switchView(targetId) {
    if (targetId === 'chatViewport') {
      chatViewport.style.display = 'flex';
      financeViewport.style.display = 'none';
      navChatBtn.classList.add('active');
      navFinanceBtn.classList.remove('active');
      sidebarContentChat.style.display = 'block';
      sidebarContentFinance.style.display = 'none';
    } else {
      chatViewport.style.display = 'none';
      financeViewport.style.display = 'flex';
      navFinanceBtn.classList.add('active');
      navChatBtn.classList.remove('active');
      sidebarContentChat.style.display = 'none';
      sidebarContentFinance.style.display = 'block';
      
      // Render/Refresh Finance Dashboard when switching to finance tab
      runSimulationAndRender();
    }

    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  }

  // ==========================================================================
  // 5. Core Financial Simulation Loop (Oct 2026 - Dec 2050)
  // ==========================================================================
  function runSimulation() {
    const monthlyData = [];
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    let fundA = parseFloat(params.fundAInit) || 0;
    let reserveB = parseFloat(params.reserveBInit) || 0;
    let pfBalance = 0;
    let condoProceeds = 0;
    
    const monthlyYieldRate = (parseFloat(params.fundAYield) || 0) / 100 / 12;

    const startYear = 2026;
    const startMonth = 10; // October 2026
    const endYear = 2050;
    const endMonth = 12; // December 2050

    let currentAge = 49; // October 2026 -> Age 49

    for (let y = startYear; y <= endYear; y++) {
      const mStart = (y === startYear) ? startMonth : 1;
      const mEnd = (y === endYear) ? endMonth : 12;

      for (let m = mStart; m <= mEnd; m++) {
        
        // Calculate Age based on October birthday
        if (y === 2026 && m < 10) currentAge = 48;
        else if (y === 2026 && m >= 10) currentAge = 49;
        else {
          currentAge = 49 + (y - 2026) - (m < 10 ? 1 : 0);
        }

        // Milestone 1: Dynamic PF Payout (Version 2: 15% Tax for withdrawal before age 55)
        let pfEventThisMonth = false;
        let pfTaxDeductedThisMonth = 0;
        let pfNetReceivedThisMonth = 0;

        const targetPFYear = parseInt(params.pfYear) || 2032;
        const targetPFMonth = parseInt(params.pfMonth) || 1;
        if (y === targetPFYear && m === targetPFMonth) {
          const rawAmount = parseFloat(params.pfAmount) || 0;
          const isEarlyPF = targetPFYear < 2032;
          pfTaxDeductedThisMonth = isEarlyPF ? (rawAmount * 0.15) : 0;
          pfNetReceivedThisMonth = rawAmount - pfTaxDeductedThisMonth;

          if (params.pfDest === 'fundA') {
            fundA += pfNetReceivedThisMonth;
          } else if (params.pfDest === 'reserveB') {
            reserveB += pfNetReceivedThisMonth;
          } else {
            pfBalance += pfNetReceivedThisMonth;
          }
          pfEventThisMonth = true;
        }

        // Milestone 2: Dynamic Sale of Condo (Default Month/Year)
        let condoEventThisMonth = false;
        const targetCondoYear = parseInt(params.condoYear) || 2028;
        const targetCondoMonth = parseInt(params.condoMonth) || 12;
        if (y === targetCondoYear && m === targetCondoMonth) {
          const gross = parseFloat(params.condoGross) || 0;
          const debt = parseFloat(params.condoDebt) || 0;
          const condoNetVal = Math.max(0, gross - debt);
          if (params.condoDest === 'reserveB') {
            reserveB += condoNetVal;
          } else if (params.condoDest === 'pf') {
            pfBalance += condoNetVal;
          } else {
            fundA += condoNetVal; // Default: Fund A
          }
          condoProceeds = condoNetVal;
          condoEventThisMonth = true;
        }

        // Milestone 3: Dynamic Manual Withdrawal from Fund A to Reserve B
        let fundAWithdrawEventThisMonth = false;
        let actualFundAWithdrawVal = 0;
        const targetFundAWithdrawYear = parseInt(params.fundAWithdrawYear) || 2030;
        const targetFundAWithdrawMonth = 1;
        if (y === targetFundAWithdrawYear && m === targetFundAWithdrawMonth) {
          const wantAmount = parseFloat(params.fundAWithdrawAmount) || 0;
          if (wantAmount > 0) {
            actualFundAWithdrawVal = Math.min(fundA, wantAmount);
            fundA -= actualFundAWithdrawVal;
            reserveB += actualFundAWithdrawVal;
            fundAWithdrawEventThisMonth = true;
          }
        }

        // Determine Income & Expenses (Yearly Override takes precedence if defined)
        let income = 0;
        let expense = 0;
        let depositToA = 0;
        let isPhase1 = false;

        // Base Phase Check
        if (y === 2026 || (y === 2027 && m <= 4)) {
          isPhase1 = true;
          depositToA = parseFloat(params.fundADeposit) || 0;
        }

        // Check Yearly Overrides for Income
        if (params.yearlyOverrides[y] && params.yearlyOverrides[y].income !== undefined) {
          income = parseFloat(params.yearlyOverrides[y].income);
        } else {
          income = isPhase1 ? (parseFloat(params.incomePhase1) || 0) : (parseFloat(params.incomePhase2) || 0);
        }

        // Check Yearly Overrides for Expense
        if (params.yearlyOverrides[y] && params.yearlyOverrides[y].expense !== undefined) {
          expense = parseFloat(params.yearlyOverrides[y].expense);
        } else {
          if (y < 2028 || (y === 2028 && m <= 12)) {
            expense = parseFloat(params.expPhase1) || 0;
          } else {
            expense = parseFloat(params.expPhase2) || 0;
          }
        }

        // Surplus in Phase 1
        if (isPhase1) {
          const surplus = income - expense - depositToA;
          if (surplus > 0) {
            reserveB += surplus;
          }
        } else {
          // Phase 2: May 2027 onwards
          income = parseFloat(params.incomePhase2) || 0;
          depositToA = 0;

          // Expense until Dec 2028 vs Jan 2029 onwards
          if (y < 2028 || (y === 2028 && m <= 12)) {
            expense = parseFloat(params.expPhase1) || 0; // 60,000 THB/mo
          } else {
            expense = parseFloat(params.expPhase2) || 0; // 15,000 THB/mo
          }
        }

        // Fund A Compound Yield Growth
        fundA += depositToA;
        fundA += (fundA * monthlyYieldRate);

        // Deficit Handling (May 2027 onwards)
        let fundATransferEvent = false;
        if (!isPhase1) {
          const deficit = expense - income;
          if (deficit > 0) {
            if (reserveB >= deficit) {
              reserveB -= deficit;
            } else {
              // Reserve B is insufficient! Transfer chunk from Fund A to Reserve B
              const transferChunk = parseFloat(params.fundATransfer) || 200000;
              const actualTransfer = Math.min(fundA, transferChunk);
              fundA -= actualTransfer;
              reserveB += actualTransfer;
              fundATransferEvent = true;

              // Deduct deficit after transfer
              reserveB -= deficit;
              if (reserveB < 0) {
                // If even after transfer reserveB is still negative, pull remaining directly from Fund A
                fundA += reserveB; // reserveB is negative
                reserveB = 0;
              }
            }
          }
        }

        // Calculate Total Net Worth & Cashflow
        const totalNetWorth = fundA + reserveB + pfBalance;
        const liquidCashflow = reserveB; // Reserve B is liquid cash balance

        const labelStr = `${thaiMonths[m - 1]} ${y}`;
        const ageLabelStr = `${labelStr} (อายุ ${currentAge})`;

        monthlyData.push({
          year: y,
          month: m,
          age: currentAge,
          label: labelStr,
          ageLabel: ageLabelStr,
          income,
          expense,
          netMonthly: income - expense,
          fundA: Math.round(fundA),
          reserveB: Math.round(reserveB),
          pfBalance: Math.round(pfBalance),
          condoProceeds: Math.round(condoProceeds),
          totalNetWorth: Math.round(totalNetWorth),
          liquidCashflow: Math.round(liquidCashflow),
          milestone: condoEventThisMonth ? `ขายคอนโด (+฿${formatCompactCurrency(condoProceeds)} เข้ากองทุน A)` : (pfEventThisMonth ? (targetPFYear < 2032 ? `ถอน PF ก่อนอายุ 55 (สุทธิ ฿${formatCompactCurrency(pfNetReceivedThisMonth)} / หักภาษี 15% ฿${formatCompactCurrency(pfTaxDeductedThisMonth)})` : `รับเงิน PF (+฿${formatCompactCurrency(pfNetReceivedThisMonth)})`) : (fundAWithdrawEventThisMonth ? `ถอนกองทุน A ย้ายเข้าสะสมทรัพย์ B (+฿${formatCompactCurrency(actualFundAWithdrawVal)})` : (fundATransferEvent ? 'เติมเงิน B จาก A (ขาดแคลน)' : '')))
        });
      }
    }

    financeState.fullMonthlyData = monthlyData;
    filterData();
  }

  // Filter Data according to Period & View Mode (Monthly / Yearly)
  function filterData() {
    let filtered = financeState.fullMonthlyData.filter(item => {
      return item.year >= financeState.startYear && item.year <= financeState.endYear;
    });

    if (financeState.viewMode === 'yearly') {
      // Group by year, taking end of year (December or last available month of year)
      const yearlyMap = {};
      filtered.forEach(item => {
        yearlyMap[item.year] = item; // Overwrite so December is kept
      });
      filtered = Object.values(yearlyMap);
    }

    financeState.filteredData = filtered;
  }

  // ==========================================================================
  // 6. UI Updates & Rendering
  // ==========================================================================
  function runSimulationAndRender() {
    runSimulation();
    updateKPICards();
    renderChart();
    renderTable();
    updateSidebarSummary();
    updatePFTaxUI();
  }

  function updatePFTaxUI() {
    const pfTaxTitle = document.getElementById('pfTaxTitle');
    const pfTaxBadge = document.getElementById('pfTaxBadge');
    const pfTaxAmountVal = document.getElementById('pfTaxAmountVal');
    const pfNetReceivedVal = document.getElementById('pfNetReceivedVal');

    if (!pfTaxTitle || !pfTaxBadge || !pfTaxAmountVal || !pfNetReceivedVal) return;

    const rawPF = parseFloat(params.pfAmount) || 0;
    const pfYear = parseInt(params.pfYear) || 2032;

    const isEarlyPF = pfYear < 2032; // Under age 55 (before year 2032)
    const taxRate = isEarlyPF ? 0.15 : 0;
    const taxAmount = rawPF * taxRate;
    const netReceived = rawPF - taxAmount;

    if (isEarlyPF) {
      pfTaxTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #F87171;"></i> เงื่อนไขภาษี PF (ถอนก่อนอายุ 55):`;
      pfTaxBadge.textContent = 'โดนหักภาษี 15%';
      pfTaxBadge.style.background = 'rgba(239, 68, 68, 0.25)';
      pfTaxBadge.style.color = '#F87171';
      pfTaxAmountVal.textContent = '฿' + Math.round(taxAmount).toLocaleString();
      pfNetReceivedVal.textContent = '฿' + Math.round(netReceived).toLocaleString();
      pfNetReceivedVal.style.color = '#F87171';
    } else {
      pfTaxTitle.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #34D399;"></i> เงื่อนไขภาษี PF (ถอนอายุ 55+):`;
      pfTaxBadge.textContent = 'ยกเว้นภาษี 0%';
      pfTaxBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      pfTaxBadge.style.color = '#34D399';
      pfTaxAmountVal.textContent = '฿0';
      pfNetReceivedVal.textContent = '฿' + Math.round(netReceived).toLocaleString();
      pfNetReceivedVal.style.color = '#34D399';
    }
  }

  function updateSidebarSummary() {
    if (sideYieldVal) {
      sideYieldVal.textContent = `${params.fundAYield}% / ปี`;
    }
  }

  function formatCompactCurrency(val) {
    if (val >= 1000000) {
      return '฿' + (val / 1000000).toFixed(1) + 'M';
    } else if (val >= 1000) {
      return '฿' + (val / 1000).toFixed(0) + 'k';
    }
    return '฿' + (val || 0).toLocaleString();
  }

  function updateKPICards() {
    const data = financeState.fullMonthlyData;
    if (!data || data.length === 0) return;

    // Get latest item in selected filter or overall
    const lastItem = financeState.filteredData[financeState.filteredData.length - 1] || data[data.length - 1];

    // Reference Header Stat Cards
    const condoNetVal = Math.max(0, (parseFloat(params.condoGross) || 0) - (parseFloat(params.condoDebt) || 0));
    const statCondoNet = document.getElementById('statCondoNet');
    if (statCondoNet) statCondoNet.textContent = formatCompactCurrency(condoNetVal);

    const statPF = document.getElementById('statPF');
    if (statPF) statPF.textContent = formatCompactCurrency(parseFloat(params.pfAmount) || 0);

    const statNetWorthTarget = document.getElementById('statNetWorthTarget');
    if (statNetWorthTarget) statNetWorthTarget.textContent = formatCompactCurrency(lastItem.totalNetWorth);

    // Baseline Cards (if present)
    const kpiNetWorth = document.getElementById('kpiNetWorth');
    if (kpiNetWorth) kpiNetWorth.textContent = formatCurrency(lastItem.totalNetWorth);
  }

  function renderChart() {
    const ctx = financeChartCanvas.getContext('2d');
    const data = financeState.filteredData;

    // X-Axis Labels: "Year Index" or "Date Label"
    const labels = data.map((d, index) => {
      if (financeState.viewMode === 'yearly') {
        const yearIndex = d.year - 2026;
        return `${yearIndex}`;
      }
      return d.ageLabel;
    });

    const datasets = [
      {
        label: 'สินทรัพย์รวมสุทธิ',
        data: data.map(d => d.totalNetWorth),
        borderColor: '#9CA3AF', // Light Gray (สีเทาอ่อน)
        backgroundColor: 'rgba(156, 163, 175, 0.12)',
        borderWidth: 3.5,
        tension: 0.2,
        fill: true
      },
      {
        label: 'เงินกองทุน (A) รวมเงินขายคอนโด',
        data: data.map(d => d.fundA),
        borderColor: '#10B981', // Emerald Green
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.2
      },
      {
        label: 'เงิน PF',
        data: data.map(d => d.pfBalance),
        borderColor: '#EAB308', // Amber Gold
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.2
      },
      {
        label: 'เงินสดสำรอง (B) / สภาพคล่องพร้อมใช้',
        data: data.map(d => d.reserveB),
        borderColor: '#F97316', // Vibrant Orange (ตัดกับรายได้ทั้งปี สีม่วง อย่างชัดเจน)
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        tension: 0.2
      },
      {
        label: 'ค่าใช้จ่ายทั้งปี',
        data: data.map(d => d.expense * 12),
        borderColor: '#EF4444', // Vivid Red (ตัดกับสินทรัพย์รวมสุทธิ สีน้ำเงิน อย่างชัดเจน)
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0
      },
      {
        label: 'รายได้ทั้งปี',
        data: data.map(d => d.income * 12),
        borderColor: '#8B5CF6', // Vivid Purple (ตัดกับเงินสดสำรอง สีส้ม อย่างชัดเจน)
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [3, 3],
        tension: 0
      }
    ];

    if (financeState.chartInstance) {
      financeState.chartInstance.destroy();
    }

    financeState.chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              font: { family: 'Prompt', size: 12 },
              usePointStyle: true,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const item = data[index];
                return `ปีที่ ${item.year - 2026} (ปี ${item.year} / อายุ ${item.age})`;
              },
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94A3B8', font: { family: 'Prompt', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94A3B8',
              font: { family: 'Prompt', size: 11 },
              callback: function(value) {
                if (value >= 1000000) return '฿' + (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return '฿' + (value / 1000).toFixed(0) + 'k';
                return '฿' + value;
              }
            }
          }
        }
      }
    });
  }

  function renderTable() {
    const data = financeState.filteredData;
    tableRecordCount.textContent = `แสดง ${data.length} รายการ (${financeState.viewMode === 'yearly' ? 'รายปี' : 'รายเดือน'})`;

    financeTableBody.innerHTML = '';

    data.forEach(item => {
      const tr = document.createElement('tr');
      if (item.milestone) tr.className = 'highlight-milestone';

      const milestoneBadge = item.milestone ? ` <span style="font-size:0.75rem; color:#F59E0B; background:rgba(245, 158, 11, 0.15); padding:2px 6px; border-radius:4px;">${item.milestone}</span>` : '';

      tr.innerHTML = `
        <td>${item.label}${milestoneBadge}</td>
        <td>${item.age} ปี</td>
        <td style="color:#06B6D4;">${formatCurrency(item.income)}</td>
        <td style="color:#EF4444;">${formatCurrency(item.expense)}</td>
        <td style="color:#3B82F6;">${formatCurrency(item.fundA)}</td>
        <td style="color:#10B981;">${formatCurrency(item.reserveB)}</td>
        <td style="color:#8B5CF6;">${formatCurrency(item.pfBalance)}</td>
        <td style="color:#F59E0B;">${formatCurrency(item.condoProceeds)}</td>
        <td style="color:#14B8A6;">${formatCurrency(item.liquidCashflow)}</td>
        <td style="font-weight:700; color:#EC4899;">${formatCurrency(item.totalNetWorth)}</td>
      `;
      financeTableBody.appendChild(tr);
    });
  }

  // Helper formatting function
  function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH').format(amount) + ' ฿';
  }

  // Export to CSV Functionality
  function exportCSV() {
    const data = financeState.filteredData;
    if (!data || data.length === 0) return;

    let csv = '\uFEFF'; // UTF-8 BOM for Excel Thai language support
    csv += 'เดือน/ปี,อายุ,รายได้ (บาท),ค่าใช้จ่าย (บาท),กองทุน A (บาท),เงินสำรอง B (บาท),เงิน PF (บาท),ขายคอนโด (บาท),กระแสเงินสด (บาท),รวมทรัพย์สินสุทธิ (บาท),หมายเหตุ\n';

    data.forEach(item => {
      csv += `"${item.label}",${item.age},${item.income},${item.expense},${item.fundA},${item.reserveB},${item.pfBalance},${item.condoProceeds},${item.liquidCashflow},${item.totalNetWorth},"${item.milestone || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LifeOS_Financial_Plan_${financeState.startYear}_${financeState.endYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Generate Year Select Options (2026 - 2050 / 25 Years)
  function populateAllYearSelectOptions() {
    const yearSelects = [
      { id: 'selIncome1Year', defaultVal: 2026, prefix: 'เริ่มปี' },
      { id: 'selIncome2Year', defaultVal: 2027, prefix: 'เริ่มลาออก' },
      { id: 'selExp1Year', defaultVal: 2026, prefix: 'เริ่มปี' },
      { id: 'selExp2Year', defaultVal: 2029, prefix: 'เริ่มปรับรายจ่าย' },
      { id: 'selCondoYear', defaultVal: 2028, prefix: 'ปีที่ขาย' },
      { id: 'selPFYear', defaultVal: 2032, prefix: 'ปีที่ถอน PF', pfTaxLabel: true },
      { id: 'selFundADepositYear', defaultVal: 2026, prefix: 'เริ่มปีที่ฝาก' },
      { id: 'selFundAWithdrawYear', defaultVal: 2030, prefix: 'ปีที่ถอนกองทุน A' },
      { id: 'selReserveBInitYear', defaultVal: 2026, prefix: 'ปีที่ตั้งต้น' }
    ];

    yearSelects.forEach(({ id, defaultVal, prefix, pfTaxLabel }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const currentVal = parseInt(el.value) || defaultVal;
      el.innerHTML = '';

      for (let y = 2026; y <= 2050; y++) {
        const yearIndex = y - 2026;
        const age = 49 + yearIndex;
        let label = `${prefix}: ปี ${y} (ปีที่ ${yearIndex} / อายุ ${age})`;
        if (pfTaxLabel) {
          if (y < 2032) {
            label = `${prefix}: ปี ${y} (อายุ ${age} - หักภาษี 15%)`;
          } else {
            label = `${prefix}: ปี ${y} (อายุ ${age} - ยกเว้นภาษี 0%)`;
          }
        }
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = label;
        if (currentVal === y) {
          opt.selected = true;
        }
        el.appendChild(opt);
      }
    });
  }

  // ==========================================================================
  // 7. Event Listeners for Dashboard Controls
  // ==========================================================================
  function setupDashboardEventListeners() {
    setupNavigation();

    // 1. Income 1 Slider & Year
    const sliderIncome1 = document.getElementById('sliderIncome1');
    const badgeIncome1 = document.getElementById('badgeIncome1');
    const sliderIncome2 = document.getElementById('sliderIncome2');
    const badgeIncome2 = document.getElementById('badgeIncome2');

    if (sliderIncome1 && badgeIncome1) {
      sliderIncome1.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeIncome1.textContent = val.toLocaleString() + ' ฿/ด.';
        params.incomePhase1 = val;
        if (paramIncomePhase1) paramIncomePhase1.value = val;

        // Constraint V2: Salary phase 2 cannot exceed salary phase 1
        if (params.incomePhase2 > params.incomePhase1) {
          params.incomePhase2 = params.incomePhase1;
          if (sliderIncome2) sliderIncome2.value = params.incomePhase2;
          if (badgeIncome2) badgeIncome2.textContent = params.incomePhase2.toLocaleString() + ' ฿/ด.';
          if (paramIncomePhase2) paramIncomePhase2.value = params.incomePhase2;
        }
        if (sliderIncome2) sliderIncome2.max = params.incomePhase1;

        runSimulationAndRender();
      });
    }

    // 2. Income 2 Slider & Year
    if (sliderIncome2 && badgeIncome2) {
      sliderIncome2.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        // Constraint V2: Salary phase 2 cannot exceed salary phase 1
        if (val > params.incomePhase1) {
          val = params.incomePhase1;
          e.target.value = val;
        }
        badgeIncome2.textContent = val.toLocaleString() + ' ฿/ด.';
        params.incomePhase2 = val;
        if (paramIncomePhase2) paramIncomePhase2.value = val;
        runSimulationAndRender();
      });
    }

    // 3. Exp 1 Slider & Year
    const sliderExp1 = document.getElementById('sliderExp1');
    const badgeExp1 = document.getElementById('badgeExp1');
    if (sliderExp1 && badgeExp1) {
      sliderExp1.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeExp1.textContent = val.toLocaleString() + ' ฿/ด.';
        params.expPhase1 = val;
        if (paramExpPhase1) paramExpPhase1.value = val;
        runSimulationAndRender();
      });
    }

    // 4. Exp 2 Slider & Year
    const sliderExp2 = document.getElementById('sliderExp2');
    const badgeExp2 = document.getElementById('badgeExp2');
    if (sliderExp2 && badgeExp2) {
      sliderExp2.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeExp2.textContent = val.toLocaleString() + ' ฿/ด.';
        params.expPhase2 = val;
        if (paramExpPhase2) paramExpPhase2.value = val;
        runSimulationAndRender();
      });
    }

    // Year Select Listeners
    const selIncome1Year = document.getElementById('selIncome1Year');
    if (selIncome1Year) {
      selIncome1Year.addEventListener('change', (e) => {
        params.income1Year = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    const selIncome2Year = document.getElementById('selIncome2Year');
    if (selIncome2Year) {
      selIncome2Year.addEventListener('change', (e) => {
        params.income2Year = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    const selExp1Year = document.getElementById('selExp1Year');
    if (selExp1Year) {
      selExp1Year.addEventListener('change', (e) => {
        params.exp1Year = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    const selExp2Year = document.getElementById('selExp2Year');
    if (selExp2Year) {
      selExp2Year.addEventListener('change', (e) => {
        params.exp2Year = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    const selFundADepositYear = document.getElementById('selFundADepositYear');
    if (selFundADepositYear) {
      selFundADepositYear.addEventListener('change', (e) => {
        params.fundADepositYear = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    // 7.2. Fund A Manual Withdrawal Slider & Year
    const sliderFundAWithdrawAmount = document.getElementById('sliderFundAWithdrawAmount');
    const badgeFundAWithdrawAmount = document.getElementById('badgeFundAWithdrawAmount');
    const selFundAWithdrawYear = document.getElementById('selFundAWithdrawYear');

    if (sliderFundAWithdrawAmount && badgeFundAWithdrawAmount) {
      sliderFundAWithdrawAmount.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeFundAWithdrawAmount.textContent = formatCompactCurrency(val);
        params.fundAWithdrawAmount = val;
        runSimulationAndRender();
      });
    }
    if (selFundAWithdrawYear) {
      selFundAWithdrawYear.addEventListener('change', (e) => {
        params.fundAWithdrawYear = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    const selReserveBInitYear = document.getElementById('selReserveBInitYear');
    if (selReserveBInitYear) {
      selReserveBInitYear.addEventListener('change', (e) => {
        params.reserveBInitYear = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    // 5. Condo Net & Condo Year Select
    const sliderCondoNet = document.getElementById('sliderCondoNet');
    const badgeCondoNet = document.getElementById('badgeCondoNet');
    const selCondoYear = document.getElementById('selCondoYear');
    if (sliderCondoNet && badgeCondoNet) {
      sliderCondoNet.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeCondoNet.textContent = formatCompactCurrency(val);
        params.condoGross = val + (parseFloat(params.condoDebt) || 0);
        if (paramCondoGross) paramCondoGross.value = params.condoGross;
        runSimulationAndRender();
      });
    }
    if (selCondoYear) {
      selCondoYear.addEventListener('change', (e) => {
        params.condoYear = parseInt(e.target.value);
        if (paramCondoYear) paramCondoYear.value = params.condoYear;
        runSimulationAndRender();
      });
    }

    // 6. PF Amount & PF Year Select
    const sliderPF = document.getElementById('sliderPF');
    const badgePF = document.getElementById('badgePF');
    const selPFYear = document.getElementById('selPFYear');
    if (sliderPF && badgePF) {
      sliderPF.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgePF.textContent = formatCompactCurrency(val);
        params.pfAmount = val;
        if (paramPFAmount) paramPFAmount.value = val;
        runSimulationAndRender();
      });
    }
    if (selPFYear) {
      selPFYear.addEventListener('change', (e) => {
        params.pfYear = parseInt(e.target.value);
        if (paramPFYear) paramPFYear.value = params.pfYear;
        runSimulationAndRender();
      });
    }

    // 7. Fund A Deposit
    const sliderFundADeposit = document.getElementById('sliderFundADeposit');
    const badgeFundADeposit = document.getElementById('badgeFundADeposit');
    if (sliderFundADeposit && badgeFundADeposit) {
      sliderFundADeposit.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeFundADeposit.textContent = val.toLocaleString() + ' ฿/ด.';
        params.fundADeposit = val;
        if (paramFundADeposit) paramFundADeposit.value = val;
        runSimulationAndRender();
      });
    }

    // 8. Reserve B Init
    const sliderReserveBInit = document.getElementById('sliderReserveBInit');
    const badgeReserveBInit = document.getElementById('badgeReserveBInit');
    if (sliderReserveBInit && badgeReserveBInit) {
      sliderReserveBInit.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeReserveBInit.textContent = formatCompactCurrency(val);
        params.reserveBInit = val;
        if (paramReserveBInit) paramReserveBInit.value = val;
        runSimulationAndRender();
      });
    }

    // 9. Fund A Yield
    const sliderFundAYield = document.getElementById('sliderFundAYield');
    const badgeFundAYield = document.getElementById('badgeFundAYield');
    if (sliderFundAYield && badgeFundAYield) {
      sliderFundAYield.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        badgeFundAYield.textContent = val.toFixed(1) + '%';
        params.fundAYield = val;
        if (paramFundAYield) paramFundAYield.value = val;
        runSimulationAndRender();
      });
    }

    // 10. Horizon Sliders
    const sliderHorizon = document.getElementById('sliderHorizon');
    const badgeHorizon = document.getElementById('badgeHorizon');
    if (sliderHorizon && badgeHorizon) {
      sliderHorizon.addEventListener('input', (e) => {
        const yrs = parseInt(e.target.value);
        badgeHorizon.textContent = yrs + ' ปี';
        financeState.startYear = 2026;
        financeState.endYear = 2026 + yrs;
        filterData();
        updateKPICards();
        renderChart();
        renderTable();
      });
    }

    // Toggle Dynamic Tuning Drawer
    if (toggleTuneBtn && tuningDrawer) {
      toggleTuneBtn.addEventListener('click', () => {
        const isHidden = tuningDrawer.style.display === 'none';
        tuningDrawer.style.display = isHidden ? 'block' : 'none';
      });
    }

    // Reset Parameters
    if (resetParamsBtn) {
      resetParamsBtn.addEventListener('click', () => {
        Object.assign(params, defaultParams);
        populateTuningInputs();
        runSimulationAndRender();
      });
    }

    // Export CSV
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportCSV);
    }

    // Period Selection Buttons
    if (periodBtnGroup) {
      const btns = periodBtnGroup.querySelectorAll('.period-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          btns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');

          const period = e.target.getAttribute('data-period');
          financeState.period = period;

          if (period === 'custom') {
            customRangeBox.style.display = 'block';
            financeState.startYear = parseInt(startYearSlider.value);
            financeState.endYear = parseInt(endYearSlider.value);
          } else {
            customRangeBox.style.display = 'none';
            const [s, eYear] = period.split('-').map(Number);
            financeState.startYear = s;
            financeState.endYear = eYear;
          }

          filterData();
          updateKPICards();
          renderChart();
          renderTable();
        });
      });
    }

    // Custom Range Sliders
    if (startYearSlider && endYearSlider) {
      startYearSlider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val > parseInt(endYearSlider.value)) {
          val = parseInt(endYearSlider.value);
          e.target.value = val;
        }
        startYearDisp.textContent = val;
        financeState.startYear = val;
        filterData();
        updateKPICards();
        renderChart();
        renderTable();
      });

      endYearSlider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val < parseInt(startYearSlider.value)) {
          val = parseInt(startYearSlider.value);
          e.target.value = val;
        }
        endYearDisp.textContent = val;
        financeState.endYear = val;
        filterData();
        updateKPICards();
        renderChart();
        renderTable();
      });
    }

    // View Mode Toggle (Monthly / Yearly)
    if (chartViewMonthly && chartViewYearly) {
      chartViewMonthly.addEventListener('click', () => {
        chartViewMonthly.classList.add('active');
        chartViewYearly.classList.remove('active');
        financeState.viewMode = 'monthly';
        filterData();
        renderChart();
        renderTable();
      });

      chartViewYearly.addEventListener('click', () => {
        chartViewYearly.classList.add('active');
        chartViewMonthly.classList.remove('active');
        financeState.viewMode = 'yearly';
        filterData();
        renderChart();
        renderTable();
      });
    }

    // Parameter Tuning Inputs Listeners
    const tuneInputs = [
      { el: paramFundAInit, key: 'fundAInit' },
      { el: paramFundAYield, key: 'fundAYield' },
      { el: paramFundADeposit, key: 'fundADeposit' },
      { el: paramFundATransfer, key: 'fundATransfer' },
      { el: paramReserveBInit, key: 'reserveBInit' },
      { el: paramIncomePhase1, key: 'incomePhase1' },
      { el: paramIncomePhase2, key: 'incomePhase2' },
      { el: paramExpPhase1, key: 'expPhase1' },
      { el: paramExpPhase2, key: 'expPhase2' },
      { el: paramCondoGross, key: 'condoGross' },
      { el: paramCondoDebt, key: 'condoDebt' },
      { el: paramCondoMonth, key: 'condoMonth' },
      { el: paramCondoYear, key: 'condoYear' },
      { el: paramCondoDest, key: 'condoDest' },
      { el: paramPFAmount, key: 'pfAmount' },
      { el: paramPFMonth, key: 'pfMonth' },
      { el: paramPFYear, key: 'pfYear' },
      { el: paramPFDest, key: 'pfDest' }
    ];

    tuneInputs.forEach(({ el, key }) => {
      if (el) {
        const eventType = (el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventType, (e) => {
          params[key] = (el.tagName === 'SELECT') ? e.target.value : (parseFloat(e.target.value) || 0);
          runSimulationAndRender();
        });
      }
    });
  }

  function populateTuningInputs() {
    if (paramFundAInit) paramFundAInit.value = params.fundAInit;
    if (paramFundAYield) paramFundAYield.value = params.fundAYield;
    if (paramFundADeposit) paramFundADeposit.value = params.fundADeposit;
    if (paramFundATransfer) paramFundATransfer.value = params.fundATransfer;
    if (paramReserveBInit) paramReserveBInit.value = params.reserveBInit;
    if (paramIncomePhase1) paramIncomePhase1.value = params.incomePhase1;
    if (paramIncomePhase2) paramIncomePhase2.value = params.incomePhase2;
    if (paramExpPhase1) paramExpPhase1.value = params.expPhase1;
    if (paramExpPhase2) paramExpPhase2.value = params.expPhase2;
    if (paramCondoGross) paramCondoGross.value = params.condoGross;
    if (paramCondoDebt) paramCondoDebt.value = params.condoDebt;
    if (paramCondoMonth) paramCondoMonth.value = params.condoMonth;
    if (paramCondoYear) paramCondoYear.value = params.condoYear;
    if (paramCondoDest) paramCondoDest.value = params.condoDest;
    if (paramPFAmount) paramPFAmount.value = params.pfAmount;
    if (paramPFMonth) paramPFMonth.value = params.pfMonth;
    if (paramPFYear) paramPFYear.value = params.pfYear;
    if (paramPFDest) paramPFDest.value = params.pfDest;

    const sliderPF = document.getElementById('sliderPF');
    const badgePF = document.getElementById('badgePF');
    const selPFYear = document.getElementById('selPFYear');
    if (sliderPF) sliderPF.value = params.pfAmount;
    if (badgePF) badgePF.textContent = formatCompactCurrency(params.pfAmount);
    if (selPFYear) selPFYear.value = params.pfYear;

    const sliderFundAWithdrawAmount = document.getElementById('sliderFundAWithdrawAmount');
    const badgeFundAWithdrawAmount = document.getElementById('badgeFundAWithdrawAmount');
    const selFundAWithdrawYear = document.getElementById('selFundAWithdrawYear');
    if (sliderFundAWithdrawAmount) sliderFundAWithdrawAmount.value = params.fundAWithdrawAmount;
    if (badgeFundAWithdrawAmount) badgeFundAWithdrawAmount.textContent = formatCompactCurrency(params.fundAWithdrawAmount);
    if (selFundAWithdrawYear) selFundAWithdrawYear.value = params.fundAWithdrawYear;
  }

  function renderYearlyOverrideTable() {
    const tbody = document.getElementById('yearlyOverrideTbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (let y = 2026; y <= 2050; y++) {
      const age = y === 2026 ? 49 : (49 + y - 2026);

      // Default baseline values
      let baseIncome = (y === 2026 || y === 2027) ? params.incomePhase1 : params.incomePhase2;
      let baseExp = (y <= 2028) ? params.expPhase1 : params.expPhase2;

      let currentIncome = params.yearlyOverrides[y]?.income !== undefined ? params.yearlyOverrides[y].income : baseIncome;
      let currentExp = params.yearlyOverrides[y]?.expense !== undefined ? params.yearlyOverrides[y].expense : baseExp;

      const diff = currentIncome - currentExp;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:var(--text-main); text-align:center;">ปี ${y} (อายุ ${age})</td>
        <td style="text-align:center;">
          <input type="number" data-year="${y}" data-type="income" class="yearly-override-input" value="${currentIncome}" step="1000" style="width:120px; background:rgba(30,41,59,0.8); color:#06B6D4; padding:6px 10px; border-radius:6px; border:1px solid var(--border-color); text-align:right; font-weight:600; font-family:inherit;">
        </td>
        <td style="text-align:center;">
          <input type="number" data-year="${y}" data-type="expense" class="yearly-override-input" value="${currentExp}" step="1000" style="width:120px; background:rgba(30,41,59,0.8); color:#EF4444; padding:6px 10px; border-radius:6px; border:1px solid var(--border-color); text-align:right; font-weight:600; font-family:inherit;">
        </td>
        <td id="yearlyDiff_${y}" style="font-weight:600; text-align:center; color:${diff >= 0 ? '#10B981' : '#F87171'};">
          ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}/ด.
        </td>
      `;
      tbody.appendChild(tr);
    }

    // Attach input event listeners
    const inputs = tbody.querySelectorAll('.yearly-override-input');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const year = parseInt(e.target.getAttribute('data-year'));
        const type = e.target.getAttribute('data-type');
        const val = parseFloat(e.target.value) || 0;

        if (!params.yearlyOverrides[year]) params.yearlyOverrides[year] = {};
        params.yearlyOverrides[year][type] = val;

        // Update row diff label live
        const baseInc = (year === 2026 || year === 2027) ? params.incomePhase1 : params.incomePhase2;
        const baseE = (year <= 2028) ? params.expPhase1 : params.expPhase2;

        const inc = params.yearlyOverrides[year].income !== undefined ? params.yearlyOverrides[year].income : baseInc;
        const exp = params.yearlyOverrides[year].expense !== undefined ? params.yearlyOverrides[year].expense : baseE;
        const diffTd = document.getElementById(`yearlyDiff_${year}`);
        if (diffTd) {
          const d = inc - exp;
          diffTd.textContent = `${d >= 0 ? '+' : ''}${formatCurrency(d)}/ด.`;
          diffTd.style.color = d >= 0 ? '#10B981' : '#F87171';
        }

        // Recalculate simulation
        runSimulation();
        updateKPICards();
        renderChart();
        renderTable();
        updateSidebarSummary();
      });
    });
  }

  // Update runSimulationAndRender to also populate yearly overrides
  const previousRunSimulationAndRender = runSimulationAndRender;
  runSimulationAndRender = function() {
    runSimulation();
    updateKPICards();
    renderChart();
    renderTable();
    updateSidebarSummary();
    renderYearlyOverrideTable();
  };

  // Extended Init Function
  const originalInit = init;
  init = function() {
    originalInit();
    populateAllYearSelectOptions();
    setupDashboardEventListeners();
    populateTuningInputs();
    runSimulationAndRender();
  };

  // Run Init
  init();
});


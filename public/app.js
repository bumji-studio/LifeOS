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
    fundADeposit: 30000, // deposit per month
    fundADepositEveryMonth: false, // false = until stop month/year
    fundADepositEndMonth: 4,
    fundADepositEndYear: 2027,
    fundATransfer: 200000, // chunk to transfer when B is depleted
    reserveBInit: 300000,

    // Dynamic Income Timeline Stages (with Month & Year Precision)
    incomeBlocks: [
      { id: 1, label: 'งานประจำช่วงแรก', startMonth: 10, startYear: 2026, endMonth: 4, endYear: 2027, amount: 95000, type: 'fixed', stepAmount: 0 },
      { id: 2, label: 'หลังลาออก', startMonth: 5, startYear: 2027, endMonth: 12, endYear: 2050, amount: 10000, type: 'fixed', stepAmount: 0 }
    ],

    // Dynamic Expense Timeline Stages (with Month & Year Precision)
    expBlocks: [
      { id: 1, label: 'ช่วงผ่อนคอนโด', startMonth: 10, startYear: 2026, endMonth: 12, endYear: 2028, amount: 60000, type: 'fixed', stepAmount: 0 },
      { id: 2, label: 'หลังหมดภาระคอนโด', startMonth: 1, startYear: 2029, endMonth: 12, endYear: 2050, amount: 15000, type: 'fixed', stepAmount: 0 }
    ],

    // Dynamic Fund A Deposit/Withdrawal Stages
    fundABlocks: [
      { id: 1, label: 'ฝากเข้ากองทุน A ช่วงแรก', startMonth: 10, startYear: 2026, endMonth: 4, endYear: 2027, amount: 30000, action: 'deposit' }
    ],

    // Dynamic Reserve B Deposit/Withdrawal Stages
    reserveBBlocks: [],

    condoGross: 5500000, // gross sale price
    condoDebt: 2000000, // bank mortgage debt
    condoMonth: 12, // sale month
    condoYear: 2028, // sale year
    condoDest: 'separate', // 'separate' | 'fundA' | 'reserveB'
    pfAmount: 2700000, // payout amount
    pfMonth: 1, // payout month
    pfYear: 2032, // payout year
    pfDest: 'pf', // 'pf' | 'fundA' | 'reserveB'
    fundAWithdrawStartYear: 2030, // start year to transfer from Fund A into Reserve B
    fundAWithdrawEndYear: 2030, // end year to transfer
    fundAWithdrawAmount: 0, // amount to transfer from Fund A into Reserve B
    fundAWithdrawEveryYear: false, // true = withdraw every year continuously
    yearlyOverrides: {} // { 2030: { income: 25000, expense: 20000 } }
  };

  // Mutable Simulation Parameters State
  const params = { ...defaultParams };

  // Dashboard State
  const financeState = {
    period: '2026-2050',
    startYear: 2026,
    endYear: 2050,
    summaryCutoffYear: 2050,
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
        let condoNetValThisMonth = 0;
        const targetCondoYear = parseInt(params.condoYear) || 2028;
        const targetCondoMonth = parseInt(params.condoMonth) || 12;
        if (y === targetCondoYear && m === targetCondoMonth) {
          const gross = parseFloat(params.condoGross) || 0;
          const debt = parseFloat(params.condoDebt) || 0;
          condoNetValThisMonth = Math.max(0, gross - debt);
          if (params.condoDest === 'reserveB') {
            reserveB += condoNetValThisMonth;
            condoProceeds = 0;
          } else if (params.condoDest === 'fundA') {
            fundA += condoNetValThisMonth;
            condoProceeds = 0;
          } else {
            // Default / 'separate': Separate line for Condo Proceeds
            condoProceeds += condoNetValThisMonth;
          }
          condoEventThisMonth = true;
        }

        // Milestone 3: Dynamic Manual Withdrawal from Fund A to Reserve B (Item 7.2)
        let fundAWithdrawEventThisMonth = false;
        let actualFundAWithdrawVal = 0;
        const startWithdrawY = parseInt(params.fundAWithdrawStartYear) || 2030;
        const endWithdrawY = parseInt(params.fundAWithdrawEndYear) || startWithdrawY;
        const wantAmount = parseFloat(params.fundAWithdrawAmount) || 0;

        let isWithdrawThisMonth = false;
        if (wantAmount > 0 && m === 1) {
          if (params.fundAWithdrawEveryYear) {
            if (y >= startWithdrawY) isWithdrawThisMonth = true;
          } else {
            if (y >= startWithdrawY && y <= endWithdrawY) isWithdrawThisMonth = true;
          }
        }

        if (isWithdrawThisMonth) {
          actualFundAWithdrawVal = Math.min(fundA, wantAmount);
          fundA -= actualFundAWithdrawVal;
          reserveB += actualFundAWithdrawVal;
          fundAWithdrawEventThisMonth = true;
        }

        // Determine Income & Expenses (Yearly Override takes precedence if defined)
        let income = 0;
        let expense = 0;
        let isPhase1 = false;

        // Base Phase Check
        if (y === 2026 || (y === 2027 && m <= 4)) {
          isPhase1 = true;
        }

        const currentKey = y * 12 + m;

        // Dynamic Fund A Deposit & Withdrawal calculation for this month
        let monthFundADeposit = 0;
        let monthFundAWithdraw = 0;
        if (params.fundABlocks && params.fundABlocks.length > 0) {
          params.fundABlocks.forEach(b => {
            const bStart = (b.startYear || 2026) * 12 + (b.startMonth || 1);
            const bEnd = (b.endYear || 2050) * 12 + (b.endMonth || 12);
            if (currentKey >= bStart && currentKey <= bEnd) {
              const amt = parseFloat(b.amount) || 0;
              if (b.action === 'withdraw') {
                monthFundAWithdraw += amt;
              } else {
                monthFundADeposit += amt;
              }
            }
          });
        }

        // Dynamic Reserve B Deposit & Withdrawal calculation for this month
        let monthReserveBDeposit = 0;
        let monthReserveBWithdraw = 0;
        if (params.reserveBBlocks && params.reserveBBlocks.length > 0) {
          params.reserveBBlocks.forEach(b => {
            const bStart = (b.startYear || 2026) * 12 + (b.startMonth || 1);
            const bEnd = (b.endYear || 2050) * 12 + (b.endMonth || 12);
            if (currentKey >= bStart && currentKey <= bEnd) {
              const amt = parseFloat(b.amount) || 0;
              if (b.action === 'withdraw') {
                monthReserveBWithdraw += amt;
              } else {
                monthReserveBDeposit += amt;
              }
            }
          });
        }

        // Check Income from Dynamic Timeline Blocks
        if (params.yearlyOverrides[y] && params.yearlyOverrides[y].income !== undefined) {
          income = parseFloat(params.yearlyOverrides[y].income);
        } else {
          if (params.incomeBlocks && params.incomeBlocks.length > 0) {
            let match = params.incomeBlocks.find(b => {
              const bStart = (b.startYear || 2026) * 12 + (b.startMonth || 1);
              const bEnd = (b.endYear || 2050) * 12 + (b.endMonth || 12);
              return currentKey >= bStart && currentKey <= bEnd;
            });
            if (!match) {
              const past = params.incomeBlocks.filter(b => {
                const bStart = (b.startYear || 2026) * 12 + (b.startMonth || 1);
                return currentKey >= bStart;
              });
              if (past.length > 0) match = past[past.length - 1];
            }
            if (match) {
              const baseAmt = parseFloat(match.amount) || 0;
              if (match.type === 'step') {
                const bStart = (match.startYear || 2026) * 12 + (match.startMonth || 1);
                const monthsPassed = Math.max(0, currentKey - bStart);
                const yearsPassed = Math.floor(monthsPassed / 12);
                const stepAmt = parseFloat(match.stepAmount) || 0;
                income = baseAmt + (yearsPassed * stepAmt);
              } else {
                income = baseAmt;
              }
            }
          }
        }

        // Check Expense from Dynamic Timeline Blocks
        if (params.yearlyOverrides[y] && params.yearlyOverrides[y].expense !== undefined) {
          expense = parseFloat(params.yearlyOverrides[y].expense);
        } else {
          if (params.expBlocks && params.expBlocks.length > 0) {
            let match = params.expBlocks.find(b => {
              const bStart = (b.startYear || 2026) * 12 + (b.startMonth || 1);
              const bEnd = (b.endYear || 2050) * 12 + (b.endMonth || 12);
              return currentKey >= bStart && currentKey <= bEnd;
            });
            if (!match) {
              const past = params.expBlocks.filter(b => {
                const bStart = (b.startYear || 2026) * 12 + (b.startMonth || 1);
                return currentKey >= bStart;
              });
              if (past.length > 0) match = past[past.length - 1];
            }
            if (match) {
              const baseAmt = parseFloat(match.amount) || 0;
              if (match.type === 'step') {
                const bStart = (match.startYear || 2026) * 12 + (match.startMonth || 1);
                const monthsPassed = Math.max(0, currentKey - bStart);
                const yearsPassed = Math.floor(monthsPassed / 12);
                const stepAmt = parseFloat(match.stepAmount) || 0;
                expense = baseAmt + (yearsPassed * stepAmt);
              } else {
                expense = baseAmt;
              }
            }
          }
        }

        // Apply Reserve B direct monthly deposit / withdrawal
        reserveB += monthReserveBDeposit;
        if (monthReserveBWithdraw > 0) {
          reserveB = Math.max(0, reserveB - monthReserveBWithdraw);
        }

        // Surplus handling in Phase 1
        if (isPhase1) {
          const surplus = income - expense - monthFundADeposit;
          if (surplus > 0) {
            reserveB += surplus;
          }
        }

        // Fund A Deposit/Withdrawal & Compound Yield Growth
        fundA += monthFundADeposit;
        if (monthFundAWithdraw > 0) {
          fundA = Math.max(0, fundA - monthFundAWithdraw);
        }
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

                // If Fund A is also exhausted (fundA < 0), pull from condoProceeds if available
                if (fundA < 0 && condoProceeds > 0) {
                  condoProceeds += fundA; // fundA is negative
                  if (condoProceeds < 0) condoProceeds = 0;
                  fundA = 0;
                }
              }
            }
          }
        }

        // Calculate Total Net Worth & Cashflow
        const totalNetWorth = fundA + reserveB + pfBalance + condoProceeds;
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
          milestone: condoEventThisMonth ? (params.condoDest === 'separate' ? `ขายคอนโด (รับเงินสุทธิ ฿${formatCompactCurrency(condoNetValThisMonth)} แยกเส้น)` : (params.condoDest === 'fundA' ? `ขายคอนโด (+฿${formatCompactCurrency(condoNetValThisMonth)} เข้ากองทุน A)` : `ขายคอนโด (+฿${formatCompactCurrency(condoNetValThisMonth)} เข้าสะสมทรัพย์ B)`)) : (pfEventThisMonth ? (targetPFYear < 2032 ? `ถอน PF ก่อนอายุ 55 (สุทธิ ฿${formatCompactCurrency(pfNetReceivedThisMonth)} / หักภาษี 15% ฿${formatCompactCurrency(pfTaxDeductedThisMonth)})` : `รับเงิน PF (+฿${formatCompactCurrency(pfNetReceivedThisMonth)})`) : (fundAWithdrawEventThisMonth ? `ถอนกองทุน A ย้ายเข้าสะสมทรัพย์ B (+฿${formatCompactCurrency(actualFundAWithdrawVal)})` : (fundATransferEvent ? 'เติมเงิน B จาก A (ขาดแคลน)' : '')))
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

    const targetYear = financeState.summaryCutoffYear || 2050;
    const filteredForSummary = data.filter(item => item.year <= targetYear);

    // Total Combined Income and Expense up to summaryCutoffYear
    const totalIncomeVal = filteredForSummary.reduce((sum, item) => sum + (item.income || 0), 0);
    const totalExpenseVal = filteredForSummary.reduce((sum, item) => sum + (item.expense || 0), 0);

    const statTotalIncome = document.getElementById('statTotalIncome');
    if (statTotalIncome) statTotalIncome.textContent = formatCompactCurrency(totalIncomeVal);

    const statTotalExpense = document.getElementById('statTotalExpense');
    if (statTotalExpense) statTotalExpense.textContent = formatCompactCurrency(totalExpenseVal);

    const countM = filteredForSummary.length;
    const yPart = Math.floor(countM / 12);
    const mPart = countM % 12;
    let durStr = '';
    if (yPart > 0 && mPart > 0) durStr = ` (${yPart} ปี ${mPart} เดือน)`;
    else if (yPart > 0) durStr = ` (${yPart} ปี)`;
    else durStr = ` (${mPart} เดือน)`;

    const statIncomeSubtext = document.getElementById('statIncomeSubtext');
    if (statIncomeSubtext) statIncomeSubtext.textContent = `สะสมถึง ธ.ค. ${targetYear}${durStr}`;

    const statExpenseSubtext = document.getElementById('statExpenseSubtext');
    if (statExpenseSubtext) statExpenseSubtext.textContent = `สะสมถึง ธ.ค. ${targetYear}${durStr}`;

    const condoNetVal = Math.max(0, (parseFloat(params.condoGross) || 0) - (parseFloat(params.condoDebt) || 0));
    const statCondoNet = document.getElementById('statCondoNet');
    if (statCondoNet) statCondoNet.textContent = formatCompactCurrency(condoNetVal);

    const statPF = document.getElementById('statPF');
    if (statPF) statPF.textContent = formatCompactCurrency(parseFloat(params.pfAmount) || 0);

    const lastItem = financeState.filteredData[financeState.filteredData.length - 1] || data[data.length - 1];
    const statNetWorthTarget = document.getElementById('statNetWorthTarget');
    if (statNetWorthTarget) statNetWorthTarget.textContent = formatCompactCurrency(lastItem.totalNetWorth);

    const kpiNetWorth = document.getElementById('kpiNetWorth');
    if (kpiNetWorth) kpiNetWorth.textContent = formatCurrency(lastItem.totalNetWorth);
  }

  function renderChart() {
    if (!financeChartCanvas) return;
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
        label: 'เงินกองทุน (A)',
        data: data.map(d => d.fundA),
        borderColor: '#10B981', // Emerald Green
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.2
      },
      {
        label: 'เงินขายคอนโดสุทธิ',
        data: data.map(d => d.condoProceeds),
        borderColor: '#06B6D4', // Bright Cyan/Teal (เส้นแยกขายคอนโดโดยเฉพาะ)
        backgroundColor: 'transparent',
        borderWidth: 2.5,
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
      { id: 'selFundADepositEndYear', defaultVal: 2027, prefix: 'ปีที่หยุดฝาก A' },
      { id: 'selFundAWithdrawYear', defaultVal: 2030, prefix: 'เริ่มถอน A ปี' },
      { id: 'selFundAWithdrawEndYear', defaultVal: 2030, prefix: 'หยุดถอน A ปี' },
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

    // Populate Stat Card Cutoff Year Selectors
    const statIncSel = document.getElementById('statIncomeYearSelect');
    const statExpSel = document.getElementById('statExpenseYearSelect');
    [statIncSel, statExpSel].forEach(el => {
      if (!el) return;
      const curYear = financeState.summaryCutoffYear || 2050;
      el.innerHTML = '';
      for (let y = 2026; y <= 2050; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = (y === 2050) ? `ปี ${y} (สิ้นสุด)` : `ปี ${y}`;
        if (y === curYear) opt.selected = true;
        el.appendChild(opt);
      }
    });

    // Populate Chart Display Start Year & End Year Selectors
    const chartStartSel = document.getElementById('chartStartYearSelect');
    const chartEndSel = document.getElementById('chartEndYearSelect');

    if (chartStartSel) {
      chartStartSel.innerHTML = '';
      for (let y = 2026; y <= 2050; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `ปี ${y}`;
        if (y === (financeState.startYear || 2026)) opt.selected = true;
        chartStartSel.appendChild(opt);
      }
    }

    if (chartEndSel) {
      chartEndSel.innerHTML = '';
      for (let y = 2026; y <= 2050; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `ปี ${y}`;
        if (y === (financeState.endYear || 2050)) opt.selected = true;
        chartEndSel.appendChild(opt);
      }
    }
  }

  function renderDynamicTimelineBlocks() {
    const incomeContainer = document.getElementById('incomeBlocksContainer');
    const expContainer = document.getElementById('expBlocksContainer');
    const fundAContainer = document.getElementById('fundABlocksContainer');
    const reserveBContainer = document.getElementById('reserveBBlocksContainer');

    const thaiMonthsNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
      'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
      'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    if (incomeContainer) {
      incomeContainer.innerHTML = '';
      (params.incomeBlocks || []).forEach((block, index) => {
        const card = document.createElement('div');
        card.className = 'timeline-block-card';
        card.style.cssText = 'background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 0.82rem;';

        let yearOptionsStart = '';
        let yearOptionsEnd = '';
        for (let y = 2026; y <= 2050; y++) {
          yearOptionsStart += `<option value="${y}" ${block.startYear == y ? 'selected' : ''}>ปี ${y}</option>`;
          yearOptionsEnd += `<option value="${y}" ${block.endYear == y ? 'selected' : ''}>ปี ${y}</option>`;
        }

        let monthOptionsStart = '';
        let monthOptionsEnd = '';
        thaiMonthsNames.forEach((mName, mIdx) => {
          const mVal = mIdx + 1;
          monthOptionsStart += `<option value="${mVal}" ${(block.startMonth || 1) == mVal ? 'selected' : ''}>${mName}</option>`;
          monthOptionsEnd += `<option value="${mVal}" ${(block.endMonth || 12) == mVal ? 'selected' : ''}>${mName}</option>`;
        });

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #38BDF8;">ช่วงรายได้ที่ ${index + 1}</span>
            <button type="button" class="btn-del-inc-block" data-index="${index}" style="background:none; border:none; color:#F87171; cursor:pointer; font-size:0.78rem; font-weight:600;">
              <i class="fa-solid fa-trash-can"></i> ลบช่วงนี้
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">เริ่มต้น:</label>
              <div style="display:flex; gap:4px;">
                <select class="inc-block-input" data-index="${index}" data-field="startMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsStart}
                </select>
                <select class="inc-block-input" data-index="${index}" data-field="startYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsStart}
                </select>
              </div>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">สิ้นสุดถึง:</label>
              <div style="display:flex; gap:4px;">
                <select class="inc-block-input" data-index="${index}" data-field="endMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsEnd}
                </select>
                <select class="inc-block-input" data-index="${index}" data-field="endYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsEnd}
                </select>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">รูปแบบ:</label>
              <select class="inc-block-input" data-index="${index}" data-field="type" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
                <option value="fixed" ${block.type === 'fixed' ? 'selected' : ''}>คงที่ประจำเดือน</option>
                <option value="step" ${block.type === 'step' ? 'selected' : ''}>เพิ่มขึ้นคงที่ประจำปี</option>
              </select>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">จำนวน (บาท/เดือน):</label>
              <input type="number" class="inc-block-input" data-index="${index}" data-field="amount" value="${block.amount}" step="1000" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
            </div>
          </div>
          ${block.type === 'step' ? `
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px; background: rgba(30,41,59,0.5); padding: 6px 8px; border-radius: 6px;">
            <span style="font-size:0.75rem; color:var(--text-muted);">+เพิ่มปีละ (บาท/เดือน):</span>
            <input type="number" class="inc-block-input" data-index="${index}" data-field="stepAmount" value="${block.stepAmount || 0}" step="500" style="flex:1; background:rgba(15,23,42,0.8); color:#FFF; padding:3px 6px; border-radius:4px; border:1px solid var(--border-color);">
          </div>
          ` : ''}
        `;
        incomeContainer.appendChild(card);
      });
    }

    if (expContainer) {
      expContainer.innerHTML = '';
      (params.expBlocks || []).forEach((block, index) => {
        const card = document.createElement('div');
        card.className = 'timeline-block-card';
        card.style.cssText = 'background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 0.82rem;';

        let yearOptionsStart = '';
        let yearOptionsEnd = '';
        for (let y = 2026; y <= 2050; y++) {
          yearOptionsStart += `<option value="${y}" ${block.startYear == y ? 'selected' : ''}>ปี ${y}</option>`;
          yearOptionsEnd += `<option value="${y}" ${block.endYear == y ? 'selected' : ''}>ปี ${y}</option>`;
        }

        let monthOptionsStart = '';
        let monthOptionsEnd = '';
        thaiMonthsNames.forEach((mName, mIdx) => {
          const mVal = mIdx + 1;
          monthOptionsStart += `<option value="${mVal}" ${(block.startMonth || 1) == mVal ? 'selected' : ''}>${mName}</option>`;
          monthOptionsEnd += `<option value="${mVal}" ${(block.endMonth || 12) == mVal ? 'selected' : ''}>${mName}</option>`;
        });

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #F87171;">ช่วงรายจ่ายที่ ${index + 1}</span>
            <button type="button" class="btn-del-exp-block" data-index="${index}" style="background:none; border:none; color:#F87171; cursor:pointer; font-size:0.78rem; font-weight:600;">
              <i class="fa-solid fa-trash-can"></i> ลบช่วงนี้
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">เริ่มต้น:</label>
              <div style="display:flex; gap:4px;">
                <select class="exp-block-input" data-index="${index}" data-field="startMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsStart}
                </select>
                <select class="exp-block-input" data-index="${index}" data-field="startYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsStart}
                </select>
              </div>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">สิ้นสุดถึง:</label>
              <div style="display:flex; gap:4px;">
                <select class="exp-block-input" data-index="${index}" data-field="endMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsEnd}
                </select>
                <select class="exp-block-input" data-index="${index}" data-field="endYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsEnd}
                </select>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">รูปแบบ:</label>
              <select class="exp-block-input" data-index="${index}" data-field="type" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
                <option value="fixed" ${block.type === 'fixed' ? 'selected' : ''}>คงที่ประจำเดือน</option>
                <option value="step" ${block.type === 'step' ? 'selected' : ''}>เพิ่มขึ้นคงที่ประจำปี</option>
              </select>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">จำนวน (บาท/เดือน):</label>
              <input type="number" class="exp-block-input" data-index="${index}" data-field="amount" value="${block.amount}" step="1000" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
            </div>
          </div>
          ${block.type === 'step' ? `
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px; background: rgba(30,41,59,0.5); padding: 6px 8px; border-radius: 6px;">
            <span style="font-size:0.75rem; color:var(--text-muted);">+เพิ่มปีละ (บาท/เดือน):</span>
            <input type="number" class="exp-block-input" data-index="${index}" data-field="stepAmount" value="${block.stepAmount || 0}" step="500" style="flex:1; background:rgba(15,23,42,0.8); color:#FFF; padding:3px 6px; border-radius:4px; border:1px solid var(--border-color);">
          </div>
          ` : ''}
        `;
        expContainer.appendChild(card);
      });
    }

    if (fundAContainer) {
      fundAContainer.innerHTML = '';
      (params.fundABlocks || []).forEach((block, index) => {
        const card = document.createElement('div');
        card.className = 'timeline-block-card';
        card.style.cssText = 'background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 0.82rem;';

        let yearOptionsStart = '';
        let yearOptionsEnd = '';
        for (let y = 2026; y <= 2050; y++) {
          yearOptionsStart += `<option value="${y}" ${block.startYear == y ? 'selected' : ''}>ปี ${y}</option>`;
          yearOptionsEnd += `<option value="${y}" ${block.endYear == y ? 'selected' : ''}>ปี ${y}</option>`;
        }

        let monthOptionsStart = '';
        let monthOptionsEnd = '';
        thaiMonthsNames.forEach((mName, mIdx) => {
          const mVal = mIdx + 1;
          monthOptionsStart += `<option value="${mVal}" ${(block.startMonth || 1) == mVal ? 'selected' : ''}>${mName}</option>`;
          monthOptionsEnd += `<option value="${mVal}" ${(block.endMonth || 12) == mVal ? 'selected' : ''}>${mName}</option>`;
        });

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #10B981;">ช่วงกองทุน A ที่ ${index + 1}</span>
            <button type="button" class="btn-del-fund-a-block" data-index="${index}" style="background:none; border:none; color:#F87171; cursor:pointer; font-size:0.78rem; font-weight:600;">
              <i class="fa-solid fa-trash-can"></i> ลบช่วงนี้
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">เริ่มต้น:</label>
              <div style="display:flex; gap:4px;">
                <select class="fund-a-block-input" data-index="${index}" data-field="startMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsStart}
                </select>
                <select class="fund-a-block-input" data-index="${index}" data-field="startYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsStart}
                </select>
              </div>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">สิ้นสุดถึง:</label>
              <div style="display:flex; gap:4px;">
                <select class="fund-a-block-input" data-index="${index}" data-field="endMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsEnd}
                </select>
                <select class="fund-a-block-input" data-index="${index}" data-field="endYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsEnd}
                </select>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">การกระทำ:</label>
              <select class="fund-a-block-input" data-index="${index}" data-field="action" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
                <option value="deposit" ${(block.action || 'deposit') === 'deposit' ? 'selected' : ''}>ฝากเข้า (+)</option>
                <option value="withdraw" ${block.action === 'withdraw' ? 'selected' : ''}>ถอนออก (-)</option>
              </select>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">จำนวน (บาท/เดือน):</label>
              <input type="number" class="fund-a-block-input" data-index="${index}" data-field="amount" value="${block.amount || 0}" step="1000" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
            </div>
          </div>
        `;
        fundAContainer.appendChild(card);
      });
    }

    if (reserveBContainer) {
      reserveBContainer.innerHTML = '';
      (params.reserveBBlocks || []).forEach((block, index) => {
        const card = document.createElement('div');
        card.className = 'timeline-block-card';
        card.style.cssText = 'background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 0.82rem;';

        let yearOptionsStart = '';
        let yearOptionsEnd = '';
        for (let y = 2026; y <= 2050; y++) {
          yearOptionsStart += `<option value="${y}" ${block.startYear == y ? 'selected' : ''}>ปี ${y}</option>`;
          yearOptionsEnd += `<option value="${y}" ${block.endYear == y ? 'selected' : ''}>ปี ${y}</option>`;
        }

        let monthOptionsStart = '';
        let monthOptionsEnd = '';
        thaiMonthsNames.forEach((mName, mIdx) => {
          const mVal = mIdx + 1;
          monthOptionsStart += `<option value="${mVal}" ${(block.startMonth || 1) == mVal ? 'selected' : ''}>${mName}</option>`;
          monthOptionsEnd += `<option value="${mVal}" ${(block.endMonth || 12) == mVal ? 'selected' : ''}>${mName}</option>`;
        });

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #F97316;">ช่วงเงินสำรอง B ที่ ${index + 1}</span>
            <button type="button" class="btn-del-reserve-b-block" data-index="${index}" style="background:none; border:none; color:#F87171; cursor:pointer; font-size:0.78rem; font-weight:600;">
              <i class="fa-solid fa-trash-can"></i> ลบช่วงนี้
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">เริ่มต้น:</label>
              <div style="display:flex; gap:4px;">
                <select class="reserve-b-block-input" data-index="${index}" data-field="startMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsStart}
                </select>
                <select class="reserve-b-block-input" data-index="${index}" data-field="startYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsStart}
                </select>
              </div>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">สิ้นสุดถึง:</label>
              <div style="display:flex; gap:4px;">
                <select class="reserve-b-block-input" data-index="${index}" data-field="endMonth" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${monthOptionsEnd}
                </select>
                <select class="reserve-b-block-input" data-index="${index}" data-field="endYear" style="flex:1; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 4px; border-radius:6px; border:1px solid var(--border-color); font-size:0.75rem;">
                  ${yearOptionsEnd}
                </select>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">การกระทำ:</label>
              <select class="reserve-b-block-input" data-index="${index}" data-field="action" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
                <option value="deposit" ${(block.action || 'deposit') === 'deposit' ? 'selected' : ''}>ฝากเข้า (+)</option>
                <option value="withdraw" ${block.action === 'withdraw' ? 'selected' : ''}>ถอนออก (-)</option>
              </select>
            </div>
            <div>
              <label style="color:var(--text-muted); display:block; font-size:0.75rem; margin-bottom:3px;">จำนวน (บาท/เดือน):</label>
              <input type="number" class="reserve-b-block-input" data-index="${index}" data-field="amount" value="${block.amount || 0}" step="1000" style="width:100%; background:rgba(30,41,59,0.8); color:#FFF; padding:4px 6px; border-radius:6px; border:1px solid var(--border-color);">
            </div>
          </div>
        `;
        reserveBContainer.appendChild(card);
      });
    }

    // Attach Event Listeners
    attachDynamicBlockListeners();
  }

  function attachDynamicBlockListeners() {
    document.querySelectorAll('.inc-block-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const field = e.target.getAttribute('data-field');
        if (params.incomeBlocks && params.incomeBlocks[idx]) {
          let val = e.target.value;
          if (field === 'startYear' || field === 'endYear' || field === 'startMonth' || field === 'endMonth') {
            val = parseInt(val);
          } else if (field === 'amount' || field === 'stepAmount') {
            val = parseFloat(val) || 0;
          }
          params.incomeBlocks[idx][field] = val;
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.btn-del-inc-block').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        if (params.incomeBlocks) {
          params.incomeBlocks.splice(idx, 1);
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.exp-block-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const field = e.target.getAttribute('data-field');
        if (params.expBlocks && params.expBlocks[idx]) {
          let val = e.target.value;
          if (field === 'startYear' || field === 'endYear' || field === 'startMonth' || field === 'endMonth') {
            val = parseInt(val);
          } else if (field === 'amount' || field === 'stepAmount') {
            val = parseFloat(val) || 0;
          }
          params.expBlocks[idx][field] = val;
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.btn-del-exp-block').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        if (params.expBlocks) {
          params.expBlocks.splice(idx, 1);
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.fund-a-block-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const field = e.target.getAttribute('data-field');
        if (params.fundABlocks && params.fundABlocks[idx]) {
          let val = e.target.value;
          if (field === 'startYear' || field === 'endYear' || field === 'startMonth' || field === 'endMonth') {
            val = parseInt(val);
          } else if (field === 'amount') {
            val = parseFloat(val) || 0;
          }
          params.fundABlocks[idx][field] = val;
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.btn-del-fund-a-block').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        if (params.fundABlocks) {
          params.fundABlocks.splice(idx, 1);
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.reserve-b-block-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const field = e.target.getAttribute('data-field');
        if (params.reserveBBlocks && params.reserveBBlocks[idx]) {
          let val = e.target.value;
          if (field === 'startYear' || field === 'endYear' || field === 'startMonth' || field === 'endMonth') {
            val = parseInt(val);
          } else if (field === 'amount') {
            val = parseFloat(val) || 0;
          }
          params.reserveBBlocks[idx][field] = val;
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });

    document.querySelectorAll('.btn-del-reserve-b-block').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        if (params.reserveBBlocks) {
          params.reserveBBlocks.splice(idx, 1);
          renderDynamicTimelineBlocks();
          runSimulationAndRender();
        }
      });
    });
  }

  // ==========================================================================
  // 7. Event Listeners for Dashboard Controls
  // ==========================================================================
  function setupDashboardEventListeners() {
    setupNavigation();

    // Summary Stat Cards Year Cutoff Listeners
    const statIncSel = document.getElementById('statIncomeYearSelect');
    const statExpSel = document.getElementById('statExpenseYearSelect');
    [statIncSel, statExpSel].forEach(sel => {
      if (sel) {
        sel.addEventListener('change', (e) => {
          const val = parseInt(e.target.value);
          financeState.summaryCutoffYear = val;
          if (statIncSel) statIncSel.value = val;
          if (statExpSel) statExpSel.value = val;
          updateKPICards();
        });
      }
    });

    // Chart Display Range Listeners (Start Year & End Year)
    const chartStartSel = document.getElementById('chartStartYearSelect');
    const chartEndSel = document.getElementById('chartEndYearSelect');

    const updateChartRangeUI = () => {
      const titleSpan = document.getElementById('chartRangeTitle');
      if (titleSpan) {
        titleSpan.textContent = `${financeState.startYear} – ${financeState.endYear}`;
      }
      filterData();
      updateKPICards();
      renderChart();
      renderTable();
    };

    if (chartStartSel) {
      chartStartSel.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val > financeState.endYear) {
          val = financeState.endYear;
          chartStartSel.value = val;
        }
        financeState.startYear = val;
        updateChartRangeUI();
      });
    }

    if (chartEndSel) {
      chartEndSel.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val < financeState.startYear) {
          val = financeState.startYear;
          chartEndSel.value = val;
        }
        financeState.endYear = val;
        updateChartRangeUI();
      });
    }

    // Add Dynamic Timeline Block Buttons
    const addIncomeBlockBtn = document.getElementById('addIncomeBlockBtn');
    if (addIncomeBlockBtn) {
      addIncomeBlockBtn.addEventListener('click', () => {
        if (!params.incomeBlocks) params.incomeBlocks = [];
        const lastBlock = params.incomeBlocks[params.incomeBlocks.length - 1];
        const nextStart = lastBlock ? Math.min(2050, lastBlock.endYear + 1) : 2026;
        params.incomeBlocks.push({
          id: Date.now(),
          label: `ช่วงรายได้ใหม่`,
          startYear: nextStart,
          endYear: 2050,
          amount: 20000,
          type: 'fixed',
          stepAmount: 0
        });
        renderDynamicTimelineBlocks();
        runSimulationAndRender();
      });
    }

    const addExpBlockBtn = document.getElementById('addExpBlockBtn');
    if (addExpBlockBtn) {
      addExpBlockBtn.addEventListener('click', () => {
        if (!params.expBlocks) params.expBlocks = [];
        const lastBlock = params.expBlocks[params.expBlocks.length - 1];
        const nextStart = lastBlock ? Math.min(2050, lastBlock.endYear + 1) : 2026;
        params.expBlocks.push({
          id: Date.now(),
          label: `ช่วงรายจ่ายใหม่`,
          startYear: nextStart,
          endYear: 2050,
          amount: 15000,
          type: 'fixed',
          stepAmount: 0
        });
        renderDynamicTimelineBlocks();
        runSimulationAndRender();
      });
    }

    const addFundABlockBtn = document.getElementById('addFundABlockBtn');
    if (addFundABlockBtn) {
      addFundABlockBtn.addEventListener('click', () => {
        if (!params.fundABlocks) params.fundABlocks = [];
        const lastBlock = params.fundABlocks[params.fundABlocks.length - 1];
        const nextStart = lastBlock ? Math.min(2050, lastBlock.endYear + 1) : 2026;
        params.fundABlocks.push({
          id: Date.now(),
          label: `ช่วงกองทุน A ใหม่`,
          startMonth: 1,
          startYear: nextStart,
          endMonth: 12,
          endYear: 2050,
          action: 'deposit',
          amount: 10000
        });
        renderDynamicTimelineBlocks();
        runSimulationAndRender();
      });
    }

    const addReserveBBlockBtn = document.getElementById('addReserveBBlockBtn');
    if (addReserveBBlockBtn) {
      addReserveBBlockBtn.addEventListener('click', () => {
        if (!params.reserveBBlocks) params.reserveBBlocks = [];
        const lastBlock = params.reserveBBlocks[params.reserveBBlocks.length - 1];
        const nextStart = lastBlock ? Math.min(2050, lastBlock.endYear + 1) : 2026;
        params.reserveBBlocks.push({
          id: Date.now(),
          label: `ช่วงเงินสำรอง B ใหม่`,
          startMonth: 1,
          startYear: nextStart,
          endMonth: 12,
          endYear: 2050,
          action: 'deposit',
          amount: 5000
        });
        renderDynamicTimelineBlocks();
        runSimulationAndRender();
      });
    }

    // Initial render of timeline blocks
    renderDynamicTimelineBlocks();

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

    // Item 7 Fund A Deposit Listeners
    const chkFundADepositEveryMonth = document.getElementById('chkFundADepositEveryMonth');
    const boxFundADepositStop = document.getElementById('boxFundADepositStop');
    const selFundADepositEndMonth = document.getElementById('selFundADepositEndMonth');
    const selFundADepositEndYear = document.getElementById('selFundADepositEndYear');

    if (chkFundADepositEveryMonth) {
      chkFundADepositEveryMonth.addEventListener('change', (e) => {
        params.fundADepositEveryMonth = e.target.checked;
        if (boxFundADepositStop) boxFundADepositStop.style.display = e.target.checked ? 'none' : 'flex';
        runSimulationAndRender();
      });
    }

    if (selFundADepositEndMonth) {
      selFundADepositEndMonth.addEventListener('change', (e) => {
        params.fundADepositEndMonth = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    if (selFundADepositEndYear) {
      selFundADepositEndYear.addEventListener('change', (e) => {
        params.fundADepositEndYear = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }

    // 7.2. Fund A Manual Withdrawal Slider & Year
    const sliderFundAWithdrawAmount = document.getElementById('sliderFundAWithdrawAmount');
    const badgeFundAWithdrawAmount = document.getElementById('badgeFundAWithdrawAmount');
    const selFundAWithdrawYear = document.getElementById('selFundAWithdrawYear');
    const chkFundAWithdrawEveryYear = document.getElementById('chkFundAWithdrawEveryYear');
    const boxFundAWithdrawStop = document.getElementById('boxFundAWithdrawStop');
    const selFundAWithdrawEndYear = document.getElementById('selFundAWithdrawEndYear');

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
        params.fundAWithdrawStartYear = parseInt(e.target.value);
        params.fundAWithdrawYear = parseInt(e.target.value);
        runSimulationAndRender();
      });
    }
    if (chkFundAWithdrawEveryYear) {
      chkFundAWithdrawEveryYear.addEventListener('change', (e) => {
        params.fundAWithdrawEveryYear = e.target.checked;
        if (boxFundAWithdrawStop) boxFundAWithdrawStop.style.display = e.target.checked ? 'none' : 'flex';
        runSimulationAndRender();
      });
    }
    if (selFundAWithdrawEndYear) {
      selFundAWithdrawEndYear.addEventListener('change', (e) => {
        params.fundAWithdrawEndYear = parseInt(e.target.value);
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
      { id: 'paramCondoGross', key: 'condoGross', isNum: true },
      { id: 'paramCondoDebt', key: 'condoDebt', isNum: true },
      { id: 'paramCondoMonth', key: 'condoMonth', isNum: true },
      { id: 'paramCondoYear', key: 'condoYear', isNum: true },
      { id: 'paramCondoDest', key: 'condoDest', isNum: false },
      { id: 'paramPFAmount', key: 'pfAmount', isNum: true },
      { id: 'paramPFMonth', key: 'pfMonth', isNum: true },
      { id: 'paramPFYear', key: 'pfYear', isNum: true },
      { id: 'paramPFDest', key: 'pfDest', isNum: false },
      { id: 'paramFundAInit', key: 'fundAInit', isNum: true },
      { id: 'paramFundAYield', key: 'fundAYield', isNum: true },
      { id: 'paramFundADeposit', key: 'fundADeposit', isNum: true },
      { id: 'paramReserveBInit', key: 'reserveBInit', isNum: true },
      { id: 'paramFundATransfer', key: 'fundATransfer', isNum: true }
    ];

    tuneInputs.forEach(({ id, key, isNum }) => {
      const el = document.getElementById(id);
      if (el) {
        const eventType = (el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventType, (e) => {
          params[key] = isNum ? (parseFloat(e.target.value) || 0) : e.target.value;
          runSimulationAndRender();
        });
      }
    });

    // Save Settings Event Listeners
    const saveParamsBtn = document.getElementById('saveParamsBtn');
    const saveParamsBtnDrawer = document.getElementById('saveParamsBtnDrawer');
    if (saveParamsBtn) saveParamsBtn.addEventListener('click', saveParams);
    if (saveParamsBtnDrawer) saveParamsBtnDrawer.addEventListener('click', saveParams);
  }

  function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.style.display = 'flex';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    }
  }

  function saveParamsToStorageSilently() {
    localStorage.setItem('lifeos_finance_params', JSON.stringify(params));
    localStorage.setItem('lifeos_finance_state', JSON.stringify({
      startYear: financeState.startYear,
      endYear: financeState.endYear,
      summaryCutoffYear: financeState.summaryCutoffYear
    }));
  }

  function saveParams() {
    saveParamsToStorageSilently();
    showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว!');
  }

  function loadSavedParams() {
    const saved = localStorage.getItem('lifeos_finance_params');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(params, parsed);
      } catch (e) {
        console.error('Error parsing saved params', e);
      }
    }
    const savedState = localStorage.getItem('lifeos_finance_state');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        if (parsedState.startYear) financeState.startYear = parsedState.startYear;
        if (parsedState.endYear) financeState.endYear = parsedState.endYear;
        if (parsedState.summaryCutoffYear) financeState.summaryCutoffYear = parsedState.summaryCutoffYear;
      } catch (e) {
        console.error('Error parsing saved state', e);
      }
    }
  }

  function populateTuningInputs() {
    const tuneIds = [
      'paramCondoGross', 'paramCondoDebt', 'paramCondoMonth', 'paramCondoYear', 'paramCondoDest',
      'paramPFAmount', 'paramPFMonth', 'paramPFYear', 'paramPFDest',
      'paramFundAInit', 'paramFundAYield', 'paramFundADeposit', 'paramReserveBInit', 'paramFundATransfer'
    ];

    const keyMap = {
      paramCondoGross: 'condoGross',
      paramCondoDebt: 'condoDebt',
      paramCondoMonth: 'condoMonth',
      paramCondoYear: 'condoYear',
      paramCondoDest: 'condoDest',
      paramPFAmount: 'pfAmount',
      paramPFMonth: 'pfMonth',
      paramPFYear: 'pfYear',
      paramPFDest: 'pfDest',
      paramFundAInit: 'fundAInit',
      paramFundAYield: 'fundAYield',
      paramFundADeposit: 'fundADeposit',
      paramReserveBInit: 'reserveBInit',
      paramFundATransfer: 'fundATransfer'
    };

    tuneIds.forEach(id => {
      const el = document.getElementById(id);
      const k = keyMap[id];
      if (el && k && params[k] !== undefined) {
        el.value = params[k];
      }
    });

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

    // Update Chart Start & End Year Selects and Stat Card Cutoff Selects
    const chartStartSel = document.getElementById('chartStartYearSelect');
    const chartEndSel = document.getElementById('chartEndYearSelect');
    if (chartStartSel && financeState.startYear) chartStartSel.value = financeState.startYear;
    if (chartEndSel && financeState.endYear) chartEndSel.value = financeState.endYear;

    const statIncSel = document.getElementById('statIncomeYearSelect');
    const statExpSel = document.getElementById('statExpenseYearSelect');
    if (statIncSel && financeState.summaryCutoffYear) statIncSel.value = financeState.summaryCutoffYear;
    if (statExpSel && financeState.summaryCutoffYear) statExpSel.value = financeState.summaryCutoffYear;
    
    const titleSpan = document.getElementById('chartRangeTitle');
    if (titleSpan) titleSpan.textContent = `${financeState.startYear} – ${financeState.endYear}`;
  }

  function renderYearlySummaryTable() {
    const tbody = document.getElementById('yearlySummaryTbody') || document.getElementById('yearlyOverrideTbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const fullData = financeState.fullMonthlyData;
    if (!fullData || fullData.length === 0) return;

    for (let y = 2026; y <= 2050; y++) {
      const yearMonths = fullData.filter(item => item.year === y);
      if (yearMonths.length === 0) continue;

      const age = y === 2026 ? 49 : (49 + y - 2026);
      
      const totalInc = yearMonths.reduce((sum, m) => sum + (m.income || 0), 0);
      const totalExp = yearMonths.reduce((sum, m) => sum + (m.expense || 0), 0);
      const totalNetYear = totalInc - totalExp;

      const avgIncMonthly = Math.round(totalInc / yearMonths.length);
      const avgExpMonthly = Math.round(totalExp / yearMonths.length);
      const diffMonthly = avgIncMonthly - avgExpMonthly;

      const isPositive = diffMonthly >= 0;
      const isPositiveYear = totalNetYear >= 0;

      const noteText = (y === 2026) ? ' <span style="font-size:0.72rem; color:var(--text-muted);">(3 เดือน)</span>' : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:var(--text-main); text-align:center;">ปี ${y} (อายุ ${age})${noteText}</td>
        <td style="text-align:center; color:#38BDF8; font-weight:600;">฿${avgIncMonthly.toLocaleString()} /ด.</td>
        <td style="text-align:center; color:#F87171; font-weight:600;">฿${avgExpMonthly.toLocaleString()} /ด.</td>
        <td style="font-weight:700; text-align:center; color:${isPositive ? '#10B981' : '#F87171'};">
          ${isPositive ? '+' : ''}฿${diffMonthly.toLocaleString()} /ด.
        </td>
        <td style="font-weight:700; text-align:center; color:${isPositiveYear ? '#10B981' : '#F87171'};">
          ${isPositiveYear ? '+' : ''}฿${totalNetYear.toLocaleString()} /ปี
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  // Update runSimulationAndRender to also populate yearly summary table and auto-save
  const previousRunSimulationAndRender = runSimulationAndRender;
  runSimulationAndRender = function() {
    runSimulation();
    updateKPICards();
    renderChart();
    renderTable();
    updateSidebarSummary();
    renderYearlySummaryTable();
    saveParamsToStorageSilently();
  };

  // Extended Init Function
  const originalInit = init;
  init = function() {
    originalInit();
    loadSavedParams();
    populateAllYearSelectOptions();
    setupDashboardEventListeners();
    populateTuningInputs();
    runSimulationAndRender();
  };

  // Run Init
  init();
});


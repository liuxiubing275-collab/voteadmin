// =========================
// Supabase 初始化
// =========================
const supabaseUrl = 'https://bhilewmilbhxowxwwyfq.supabase.co';
const supabaseKey = 'sb_publishable_Qnzwloea8NOgqdtkhDVUEw_g_iIPMcD'; // 只用公开 key
const db = supabase.createClient(supabaseUrl, supabaseKey);

// =========================
// 后台密码
// =========================
const ADMIN_PASSWORD = '123456';

// =========================
// 页面元素
// =========================
const resultsDiv = document.getElementById('results');
const totalVotersSpan = document.getElementById('totalVoters');
const refreshBtn = document.getElementById('refreshBtn');
let votesChart = null;

// =========================
// 登录
// =========================
function login() {
  const password = document.getElementById('adminPassword').value;
  if (password === ADMIN_PASSWORD) {
    document.getElementById('loginOverlay').style.display = 'none';
    loadResults();
  } else {
    alert('密码错误');
  }
}

// =========================
// 刷新按钮
// =========================
refreshBtn.addEventListener('click', loadResults);

// =========================
// 加载统计数据
// =========================
async function loadResults() {
  resultsDiv.innerHTML = '';

  // 1️⃣ 查询总参与人数
  const { data: voterData, error: voterError } = await db
    .from('votes')
    .select('user_code');

  if (voterError) {
    alert('获取总参与人数失败：' + voterError.message);
    return;
  }

  const uniqueUsers = [...new Set(voterData.map(v => v.user_code))];
  const totalVoters = uniqueUsers.length;
  totalVotersSpan.textContent = totalVoters;

  // 2️⃣ 查询所有候选人
  const { data: candidates, error: candidatesError } = await db
    .from('candidates')
    .select('*');

  if (candidatesError) {
    alert('获取候选人失败：' + candidatesError.message);
    return;
  }

  // 3️⃣ 统计每个候选人票数
  const stats = [];
  for (const c of candidates) {
    const { data: votes } = await db
      .from('votes')
      .select('*')
      .eq('candidate_id',  parseInt(c.id));
    const voteCount = votes ? votes.length : 0;
console.log(
  '候选人ID:',
  c.id,
  '票数:',
  votes
);
    const rate = totalVoters > 0 ? Math.round((voteCount / totalVoters) * 100) : 0;
    stats.push({
      name: c.name,
      position: c.position,
      votes: voteCount,
      rate: rate
    });
  }

  // 4️⃣ 自动排序（票数高→低）
  stats.sort((a, b) => b.votes - a.votes);

  // 5️⃣ 生成候选人卡片 & 图表数据
  const labels = [];
  const voteCounts = [];
  const barColors = [];

  stats.forEach(s => {
    // 卡片
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML = `
      <div class="candidate-info">
        <div class="name">${s.name}</div>
        <div class="position">${s.position}</div>
      </div>
      <div class="candidate-stats">
        <div class="votes">${s.votes}票</div>
        <div class="rate ${s.rate >= 50 ? 'green' : 'red'}">${s.rate}%</div>
      </div>
    `;
    resultsDiv.appendChild(card);

    labels.push(`${s.name} (${s.position})`);
    voteCounts.push(s.votes);
    barColors.push(s.rate >= 50 ? '#16a34a' : '#dc2626');
  });

  // 6️⃣ 绘制图表
  const ctx = document.getElementById('votesChart').getContext('2d');
  if (votesChart) votesChart.destroy();

  votesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: voteCounts,
        backgroundColor: barColors,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#111',
          font: { weight: 'bold', size: 14 },
          formatter: function(value) {
            const rate = totalVoters > 0 ? Math.round((value / totalVoters) * 100) : 0;
            return rate + '%';
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// 页面加载时，后台需登录后才可加载
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginOverlay').style.display = 'flex';
});
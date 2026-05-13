// Supabase 初始化
const supabaseUrl = 'https://bhilewmilbhxowxwwyfq.supabase.co';
const supabaseKey = '你的SupabaseKey'; // 只用公开key
const db = supabase.createClient(supabaseUrl, supabaseKey);

// 获取元素
const resultsDiv = document.getElementById('results');
const totalVotersSpan = document.getElementById('totalVoters');
const refreshBtn = document.getElementById('refreshBtn');
let votesChart = null; // 图表实例

// 刷新按钮事件
refreshBtn.addEventListener('click', loadResults);

// 加载统计数据
async function loadResults() {

  resultsDiv.innerHTML = ''; // 清空

  // 1️⃣ 总参与人数
  const { data: voterData, error: voterError } =
    await db.from('votes')
            .select('user_code', { count: 'exact', distinct: true });

  if (voterError) {
    alert('获取总参与人数失败：' + voterError.message);
    return;
  }

  const totalVoters = voterData.length;
  totalVotersSpan.textContent = totalVoters;

  // 2️⃣ 所有候选人
  const { data: candidates, error: candidatesError } =
    await db.from('candidates').select('*');

  if (candidatesError) {
    alert('获取候选人失败：' + candidatesError.message);
    return;
  }

  // 3️⃣ 统计每个候选人票数并生成卡片
  const labels = [];
  const voteCounts = [];
  const barColors = [];

  for (const c of candidates) {
    const { data: votes, error: votesError } =
      await db.from('votes')
              .select('*')
              .eq('candidate_id', c.id);

    const voteCount = votes ? votes.length : 0;
    const rate = totalVoters > 0
      ? Math.round((voteCount / totalVoters) * 100)
      : 0;

    // 卡片
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML = `
      <div class="candidate-info">
        <div class="name">${c.name}</div>
        <div class="position">${c.position}</div>
      </div>
      <div class="candidate-stats">
        <div class="votes">${voteCount}票</div>
        <div class="rate ${rate >= 50 ? 'green' : 'red'}">${rate}%</div>
      </div>
    `;
    resultsDiv.appendChild(card);

    // 图表数据
    labels.push(`${c.name} (${c.position})`);
    voteCounts.push(voteCount);
    barColors.push(rate >= 50 ? '#16a34a' : '#dc2626'); // 高于50%绿，否则红
  }

  // 4️⃣ 绘制图表
  const ctx = document.getElementById('votesChart').getContext('2d');

  if (votesChart) {
    votesChart.destroy(); // 先销毁旧图表
  }

votesChart = new Chart(ctx, {

  type: 'bar',

  data: {

    labels: labels,

    datasets: [{

      label: '票数',

      data: voteCounts,

      backgroundColor: barColors,

      borderRadius: 6,

      borderWidth: 1

    }]

  },

  options: {

    responsive: true,

    plugins: {

      legend: {

        display: false

      },

      tooltip: {

        enabled: true

      },

      // 百分比标签
      datalabels: {

        anchor: 'end',

        align: 'top',

        color: '#111',

        font: {

          weight: 'bold',

          size: 14

        },

        formatter: function(value) {

          // 获取当前柱子的百分比
          const rate =
            totalVoters > 0
            ? Math.round(
                value
                / totalVoters
                * 100
              )
            : 0;

          return rate + '%';

        }

      }

    },

    scales: {

      y: {

        beginAtZero: true,

        ticks: {

          precision: 0

        }

      }

    }

  },

  plugins: [ChartDataLabels]

});

// 页面加载时调用
window.addEventListener('DOMContentLoaded', loadResults);
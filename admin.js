// =========================
// Supabase 初始化
// =========================
const supabaseUrl = 'https://bhilewmilbhxowxwwyfq.supabase.co';
const supabaseKey = 'sb_publishable_Qnzwloea8NOgqdtkhDVUEw_g_iIPMcD'; // 只用公开 key
const db = supabase.createClient(supabaseUrl, supabaseKey);

// 后台密码
const ADMIN_PASSWORD = '123456';

// 页面元素
const resultsDiv = document.getElementById('results');
const totalVotersSpan = document.getElementById('totalVoters');
const refreshBtn = document.getElementById('refreshBtn');
const resetBtn = document.getElementById('resetBtn');
const manualInput = document.getElementById('manualVoterInput');
const manualInfo = document.getElementById('manualInfo');
const confirmVoterBtn = document.getElementById('confirmVoterBtn');
let votesChart = null;

// 登录
function login(){
  const password = document.getElementById('adminPassword').value;
  if(password === ADMIN_PASSWORD){
    document.getElementById('loginOverlay').style.display='none';
    loadResults();
  }else{ alert('密码错误'); }
}

// 刷新数据
refreshBtn.addEventListener('click', loadResults);

// 确认手动输入参与人数
confirmVoterBtn.addEventListener('click', ()=>{
  const val = Number(manualInput.value);
  if(val>0){
    const actualVoters = Number(totalVotersSpan.textContent);
    const rate = Math.min(100, (actualVoters/val*100).toFixed(1));
    manualInfo.textContent = `实际投票人数：${actualVoters}，参与率：${rate}%`;
  }else{
    manualInfo.textContent = '';
  }
});

// 重置投票数据 + 序列号
const resetBtn = document.getElementById('resetVotesBtn');

resetBtn.addEventListener('click', async () => {

    // 第一次确认
    const confirm1 = confirm(
        '确定要清空所有投票数据吗？'
    );

    if (!confirm1) return;

    // 第二次确认
    const confirm2 = confirm(
        '此操作不可恢复！\n\n将执行：\n1. 清空全部投票\n2. 重置全部序列号\n\n是否继续？'
    );

    if (!confirm2) return;

    try {

        // 显示加载状态
        resetBtn.disabled = true;
        resetBtn.innerText = '正在复位...';

        // ========================
        // 1. 删除 votes 表
        // ========================

        const { error: deleteError } = await supabase
            .from('votes')
            .delete()
            .neq('id', 0);

        if (deleteError) throw deleteError;

        // ========================
        // 2. 重置 codes
        // ========================

        const { error: updateError } = await supabase
            .from('codes')
            .update({
                used: false
            })
            .neq('id', 0);

        if (updateError) throw updateError;

        // ========================
        // 3. 清空前端显示
        // ========================

        const cards = document.querySelectorAll('.candidate-card');

        cards.forEach(card => {

            const voteEl = card.querySelector('.vote-count');
            const rateEl = card.querySelector('.vote-rate');

            if (voteEl) voteEl.innerText = '0票';
            if (rateEl) rateEl.innerText = '0%';

        });

        // 总参与人数
        const totalEl = document.getElementById('totalVotes');

        if (totalEl) {
            totalEl.innerText = '0';
        }

        // ========================
        // 4. 提示成功
        // ========================

        alert('全部投票数据已复位成功！');

        // ========================
        // 5. 自动刷新后台数据
        // ========================

        if (typeof loadResults === 'function') {
            loadResults();
        }

    } catch (err) {

        console.error(err);

        alert('复位失败：' + err.message);

    } finally {

        resetBtn.disabled = false;
        resetBtn.innerText = '复位全部投票';

    }

});

// 加载统计数据
async function loadResults(){
  resultsDiv.innerHTML='';

  // 总参与人数
  const {data: voterData,error:voterError} = await db.from('votes').select('user_code');
  if(voterError){ alert('获取总参与人数失败：'+voterError.message); return; }
  const uniqueUsers = [...new Set(voterData.map(v=>v.user_code))];
  const totalVoters = uniqueUsers.length;
  totalVotersSpan.textContent = totalVoters;

  // 查询候选人
  const {data: candidates, error:candidatesError} = await db.from('candidates').select('*');
  if(candidatesError){ alert('获取候选人失败：'+candidatesError.message); return; }

  // 按岗位分组
  const groups = {};
  for(const c of candidates){
    if(!groups[c.position]) groups[c.position] = [];
    groups[c.position].push(c);
  }

  // 生成卡片 & 图表数据
  const labels = [], voteCounts=[], barColors=[];
  for(const pos in groups){
    const groupDiv = document.createElement('div');
    groupDiv.className='candidate-group';
    groupDiv.innerHTML=`<div class="group-title">${pos}</div>`;
    for(const c of groups[pos]){
      const {data:votes,error:votesError} = await db.from('votes').select('*').eq('candidate_id', Number(c.id));
      const voteCount = votes ? votes.length : 0;
      const rate = totalVoters>0? Math.round(voteCount/totalVoters*100):0;

      const card = document.createElement('div');
      card.className='candidate-card';
      card.innerHTML=`
        <div class="candidate-info">
          <div class="name">${c.name}</div>
          <div class="position">${c.position}</div>
        </div>
        <div class="candidate-stats">
          <div class="votes">${voteCount}票</div>
          <div class="rate ${rate>=50?'green':'red'}">${rate}%</div>
        </div>
      `;
      groupDiv.appendChild(card);

      labels.push(`${c.name}(${c.position})`);
      voteCounts.push(voteCount);
      barColors.push(rate>=50?'#16a34a':'#dc2626');
    }
    resultsDiv.appendChild(groupDiv);
  }

  // 绘制柱状图
  const ctx = document.getElementById('votesChart').getContext('2d');
  if(votesChart) votesChart.destroy();
  votesChart = new Chart(ctx,{
    type:'bar',
    data:{labels:labels,datasets:[{data:voteCounts,backgroundColor:barColors,borderRadius:6}]},
    options:{
      responsive:true,
      plugins:{
        legend:{display:false},
        datalabels:{
          anchor:'end',
          align:'top',
          color:'#111',
          font:{weight:'bold',size:14},
          formatter:function(value){ return totalVoters>0? Math.round(value/totalVoters*100)+'%' : '0%'; }
        }
      },
      scales:{y:{beginAtZero:true,ticks:{precision:0}}}
    },
    plugins:[ChartDataLabels]
  });
}

// 页面加载时显示登录
window.addEventListener('DOMContentLoaded',()=>{document.getElementById('loginOverlay').style.display='flex';});
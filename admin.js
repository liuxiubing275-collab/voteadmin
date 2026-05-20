// =======================
// Supabase 初始化
// =======================

const supabaseUrl = 'https://bhilewmilbhxowxwwyfq.supabase.co';
const supabaseKey = 'sb_publishable_Qnzwloea8NOgqdtkhDVUEw_g_iIPMcD';

const sb = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// =======================
// 登录功能
// =======================

window.login = function () {

    const pwd = document.getElementById('adminPassword').value;

    if (pwd === '123456') {

        document.getElementById('loginBox').style.display = 'none';

        document.getElementById('adminPanel').style.display = 'block';

        loadResults();

    } else {

        alert('密码错误');

    }

};

// =======================
// 加载投票结果
// =======================

async function loadResults() {

    try {

        // =======================
        // 读取候选人
        // =======================

        const { data: candidates, error: candidateError } =
            await sb
                .from('candidates')
                .select('*')
                .order('position', { ascending: true });

        if (candidateError) throw candidateError;

        // =======================
        // 读取 votes
        // =======================

        const { data: votes, error: voteError } =
            await sb
                .from('votes')
                .select('*');

        if (voteError) throw voteError;

        // =======================
        // 统计参与人数
        // =======================

        const uniqueCodes = new Set();

        votes.forEach(v => {

            if (v.code) {
                uniqueCodes.add(v.code);
            }

        });

        const totalVoteUsers = uniqueCodes.size;

        document.getElementById('votedUsers').innerText =
            totalVoteUsers;

        // =======================
        // 参与率
        // =======================

        const totalInput =
            parseInt(document.getElementById('totalPeople').value) || 0;

        const joinRate =
            totalInput > 0
                ? ((totalVoteUsers / totalInput) * 100).toFixed(1)
                : 0;

        document.getElementById('joinRate').innerText =
            joinRate + '%';

        // =======================
        // 统计候选人票数
        // =======================

        const voteMap = {};

        votes.forEach(v => {

            if (!voteMap[v.candidate_id]) {
                voteMap[v.candidate_id] = 0;
            }

            voteMap[v.candidate_id]++;

        });

        // =======================
        // 岗位分组
        // =======================

        const positionMap = {};

        candidates.forEach(c => {

            if (!positionMap[c.position]) {
                positionMap[c.position] = [];
            }

            const count = voteMap[c.id] || 0;

            const rate =
                totalVoteUsers > 0
                    ? ((count / totalVoteUsers) * 100).toFixed(1)
                    : 0;

            positionMap[c.position].push({
                ...c,
                votes: count,
                rate: rate
            });

        });

        // =======================
        // 候选人排序
        // =======================

        Object.keys(positionMap).forEach(key => {

            positionMap[key].sort((a, b) => b.votes - a.votes);

        });

        // =======================
        // 渲染页面
        // =======================

        const container =
            document.getElementById('resultsContainer');

        container.innerHTML = '';

        Object.keys(positionMap).forEach(position => {

            const section = document.createElement('div');

            section.className = 'position-section';

            let html = `
                <div class="position-title">
                    ${position}
                </div>

                <div class="candidate-list">
            `;

            positionMap[position].forEach(c => {

                const color =
                    parseFloat(c.rate) >= 50
                        ? '#16a34a'
                        : '#dc2626';

                html += `
                    <div class="candidate-card">

                        <div class="candidate-name">
                            ${c.name}
                        </div>

                        <div class="candidate-votes">
                            ${c.votes}票
                        </div>

                        <div 
                            class="candidate-rate"
                            style="color:${color}"
                        >
                            ${c.rate}%
                        </div>

                    </div>
                `;

            });

            html += '</div>';

            section.innerHTML = html;

            container.appendChild(section);

        });

    } catch (err) {

        console.error(err);

        alert('加载数据失败：' + err.message);

    }

}

// =======================
// 刷新按钮
// =======================

window.refreshResults = function () {

    loadResults();

};

// =======================
// 复位全部投票
// =======================

window.resetVotes = async function () {

    const confirm1 =
        confirm('确定清空全部投票数据？');

    if (!confirm1) return;

    const confirm2 =
        confirm('此操作不可恢复，是否继续？');

    if (!confirm2) return;

    try {

        // 删除 votes

        const { error: deleteError } =
            await sb
                .from('votes')
                .delete()
                .neq('id', 0);

        if (deleteError) throw deleteError;

        // 重置 codes

        const { error: updateError } =
            await sb
                .from('codes')
                .update({
                    used: false
                })
                .neq('id', 0);

        if (updateError) throw updateError;

        alert('复位成功');

        loadResults();

    } catch (err) {

        console.error(err);

        alert('复位失败：' + err.message);

    }

};

// =======================
// Excel 导出
// =======================

window.exportExcel = async function () {

    try {

        const { data: candidates } =
            await sb
                .from('candidates')
                .select('*');

        const { data: votes } =
            await sb
                .from('votes')
                .select('*');

        const voteMap = {};

        votes.forEach(v => {

            if (!voteMap[v.candidate_id]) {
                voteMap[v.candidate_id] = 0;
            }

            voteMap[v.candidate_id]++;

        });

        let csv =
            '岗位,姓名,票数\n';

        candidates.forEach(c => {

            csv +=
                `${c.position},${c.name},${voteMap[c.id] || 0}\n`;

        });

        const blob =
            new Blob(
                [csv],
                { type: 'text/csv;charset=utf-8;' }
            );

        const link =
            document.createElement('a');

        link.href =
            URL.createObjectURL(blob);

        link.download =
            '投票结果.csv';

        link.click();

    } catch (err) {

        console.error(err);

        alert('导出失败');

    }

};
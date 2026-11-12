// === CONEXÃO COM O SUPABASE (JÁ CONFIGURADA) ===
const SUPABASE_URL = 'https://zklpwoowkmtiyhvstkgh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WmFsHCDm7npNXAZVK41n9g_j4hxHqtC';

// Usando 'supabaseClient' para evitar conflito com a biblioteca global
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formTurma = document.getElementById('formTurma');
const formAluno = document.getElementById('formAluno');
const formColeta = document.getElementById('formColeta');
const selectTurma = document.getElementById('selectTurma');
const selectAluno = document.getElementById('selectAluno');
const tabelaColetas = document.getElementById('tabelaColetas');
const rankingTurmas = document.getElementById('rankingTurmas');

// 1. Cadastrar Turma (CREATE)
formTurma.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeTurma').value;
    const prof = document.getElementById('professora').value;
    
    const { error } = await supabaseClient.from('turmas').insert([{ nome_turma: nome, professora: prof }]);
    
    if (error) alert('Erro: ' + error.message);
    else { 
        alert('Turma cadastrada!'); 
        formTurma.reset(); 
        carregarTurmas(); 
    }
});

// 2. Cadastrar Aluno (CREATE)
formAluno.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeAluno').value;
    const turmaId = selectTurma.value;
    
    const { error } = await supabaseClient.from('alunos').insert([{ nome_aluno: nome, turma_id: turmaId }]);
    
    if (error) alert('Erro: ' + error.message);
    else { 
        alert('Aluno cadastrado!'); 
        formAluno.reset(); 
        carregarAlunos(); 
    }
});

// 3. Registrar Coleta (CREATE)
formColeta.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = selectAluno.value;
    const tipo = document.getElementById('tipoMaterial').value;
    const qtd = document.getElementById('quantidade').value;
    
    const { error } = await supabaseClient.from('coletas').insert([{ aluno_id: alunoId, tipo_material: tipo, quantidade: qtd }]);
    
    if (error) alert('Erro: ' + error.message);
    else { 
        alert('Coleta registrada!'); 
        formColeta.reset(); 
        carregarColetas(); 
        carregarRanking(); 
    }
});

// READ - Turmas
async function carregarTurmas() {
    const { data, error } = await supabaseClient.from('turmas').select('*');
    if (error) return console.error(error);
    
    selectTurma.innerHTML = '<option value="">Selecione...</option>';
    data.forEach(t => { 
        selectTurma.innerHTML += `<option value="${t.id}">${t.nome_turma}</option>`; 
    });
}

// READ - Alunos
async function carregarAlunos() {
    const { data, error } = await supabaseClient.from('alunos').select('*');
    if (error) return console.error(error);
    
    selectAluno.innerHTML = '<option value="">Selecione...</option>';
    data.forEach(a => { 
        selectAluno.innerHTML += `<option value="${a.id}">${a.nome_aluno}</option>`; 
    });
}

// READ - Coletas (com JOIN para pegar o nome do aluno e da turma)
async function carregarColetas() {
    const { data, error } = await supabaseClient
        .from('coletas')
        .select(`id, tipo_material, quantidade, alunos ( nome_aluno, turmas ( nome_turma ) )`);
        
    if (error) return console.error(error);

    tabelaColetas.innerHTML = '';
    
    if (data.length === 0) {
        tabelaColetas.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma coleta registrada ainda.</td></tr>';
        return;
    }

    data.forEach(c => {
        const alunoNome = c.alunos ? c.alunos.nome_aluno : 'Desconhecido';
        const turmaNome = c.alunos && c.alunos.turmas ? c.alunos.turmas.nome_turma : '-';
        
        tabelaColetas.innerHTML += `
            <tr>
                <td><strong>${alunoNome}</strong></td>
                <td>${turmaNome}</td>
                <td>${c.tipo_material}</td>
                <td>${c.quantidade}</td>
                <td>
                    <button class="btn-editar" onclick="editarColeta(${c.id}, ${c.quantidade})">Editar</button>
                    <button class="btn-excluir" onclick="excluirColeta(${c.id})">Excluir</button>
                </td>
            </tr>`;
    });
}

// UPDATE - Editar Coleta
async function editarColeta(id, quantidadeAtual) {
    const novaQtd = prompt("Digite a nova quantidade de itens:", quantidadeAtual);
    
    if (novaQtd === null || novaQtd === "" || isNaN(novaQtd)) return;

    const { error } = await supabaseClient
        .from('coletas')
        .update({ quantidade: parseInt(novaQtd) })
        .eq('id', id);

    if (error) {
        alert('Erro ao atualizar: ' + error.message);
    } else {
        alert('Quantidade atualizada com sucesso!');
        carregarColetas();
        carregarRanking();
    }
}

// DELETE - Excluir Coleta
async function excluirColeta(id) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    
    const { error } = await supabaseClient.from('coletas').delete().eq('id', id);
    
    if (error) alert('Erro: ' + error.message);
    else { 
        alert('Registro excluído!'); 
        carregarColetas(); 
        carregarRanking(); 
    }
}

// READ - Ranking
async function carregarRanking() {
    const { data, error } = await supabaseClient
        .from('coletas')
        .select(`quantidade, alunos ( turmas ( nome_turma ) )`);
        
    if (error) return console.error(error);

    const agrupado = {};
    data.forEach(c => {
        const turma = c.alunos && c.alunos.turmas ? c.alunos.turmas.nome_turma : 'Sem Turma';
        if (!agrupado[turma]) agrupado[turma] = 0;
        agrupado[turma] += c.quantidade;
    });

    rankingTurmas.innerHTML = '';
    const sorted = Object.entries(agrupado).sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
        rankingTurmas.innerHTML = '<p style="color:#888; font-size:14px;">Nenhuma coleta registrada ainda.</p>';
    } else {
        sorted.forEach(([turma, total]) => {
            rankingTurmas.innerHTML += `<li><span>${turma}</span> <span>${total} itens</span></li>`;
        });
    }
}

// Inicializar a página
async function init() {
    await carregarTurmas();
    await carregarAlunos();
    await carregarColetas();
    await carregarRanking();
}
init();
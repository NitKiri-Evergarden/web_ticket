// App.js - Ponto de entrada principal para o aplicativo React
import React, { useState, useEffect } from 'react';
import './App.css';

// Utilitário para gerar número de senha: YYMMDD-PPSQ
const generateTicketNumber = (type, sequence, date) => {
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const pp = type;
  const sq = sequence.toString().padStart(2, '0');
  return `${yy}${mm}${dd}-${pp}${sq}`;
};

// Utilitário para obter variação aleatória para TM
const getAttendanceTime = (type) => {
  let baseTime;
  if (type === 'SP') {
    baseTime = 15 * 60 * 1000; // 15 min em ms
    const variation = (Math.random() * 10 - 5) * 60 * 1000; // +/- 5 min em distribuição igual
    return baseTime + variation;
  } else if (type === 'SG') {
    baseTime = 5 * 60 * 1000; // 5 min
    const variation = (Math.random() * 6 - 3) * 60 * 1000; // +/- 3 min em proporção igual
    return baseTime + variation;
  } else if (type === 'SE') {
    const isLong = Math.random() < 0.05; // 5% de chance de 5 min
    return isLong ? 5 * 60 * 1000 : 1 * 60 * 1000; // 95% 1 min, 5% 5 min
  }
  return 0;
};

// Componente principal do App
function App() {
  const [queues, setQueues] = useState({ SP: [], SG: [], SE: [] }); // Filas para cada tipo de senha
  const [sequences, setSequences] = useState({ SP: 1, SG: 1, SE: 1 }); // Sequências diárias por tipo
  const [currentTime, setCurrentTime] = useState(new Date(2025, 10, 21, 7, 0)); // Tempo simulado iniciando às 7h em 21/11/2025
  const [isOpen, setIsOpen] = useState(false); // Expediente está aberto?
  const [guiches, setGuiches] = useState([
    { id: 1, currentTicket: null, endTime: null },
    { id: 2, currentTicket: null, endTime: null },
    { id: 3, currentTicket: null, endTime: null },
  ]); // 3 guichês
  const [lastCalls, setLastCalls] = useState([]); // Últimas 5 chamadas
  const [issuedTickets, setIssuedTickets] = useState([]); // Todas as senhas emitidas com detalhes
  const [attendedTickets, setAttendedTickets] = useState([]); // Senhas atendidas
  const [discardedTickets, setDiscardedTickets] = useState([]); // Senhas descartadas (5% ou fim do dia)
  const [lastPriority, setLastPriority] = useState(null); // Tipo de prioridade da última chamada (para alternância SP vs non-SP)
  const [dailyReports, setDailyReports] = useState([]); // Relatórios diários para agregação mensal
  const [showMonthlyReport, setShowMonthlyReport] = useState(false); // Mostrar relatório mensal?
  const [notificationPermission, setNotificationPermission] = useState('default'); // Permissão para notificações

  // Solicitar permissão para notificações ao montar o componente
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // Simular passagem do tempo a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prev) => new Date(prev.getTime() + 1000)); // Avançar 1 segundo
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Verificar fechamento automático baseado no horário
  useEffect(() => {
    const now = currentTime;
    const today5pm = new Date(now);
    today5pm.setHours(17, 0, 0, 0);

    if (now >= today5pm && isOpen) {
      closeOffice();
    }
  }, [currentTime, isOpen]);

  // Manipular timers dos guichês para finalização automática do atendimento
  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = currentTime.getTime();
      setGuiches((prev) =>
        prev.map((g) => {
          if (g.currentTicket && g.endTime <= nowMs) {
            finishAttendance(g.id);
          }
          return g;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTime]);

  // Abrir expediente
  const openOffice = () => {
    setIsOpen(true);
    setSequences({ SP: 1, SG: 1, SE: 1 }); // Resetar sequências diariamente
    setIssuedTickets([]);
    setAttendedTickets([]);
    setDiscardedTickets([]);
    setLastCalls([]);
    setQueues({ SP: [], SG: [], SE: [] });
    setLastPriority(null);
  };

  // Fechar expediente e descartar senhas restantes
  const closeOffice = () => {
    // Finalizar atendimentos em andamento
    setGuiches((prev) =>
      prev.map((g) => {
        if (g.currentTicket) {
          g.currentTicket.finishTime = new Date(currentTime);
        }
        return { ...g, currentTicket: null, endTime: null };
      })
    );

    // Descartar senhas restantes nas filas
    const remaining = [...queues.SP, ...queues.SG, ...queues.SE];
    setDiscardedTickets((prev) => [...prev, ...remaining]);
    setQueues({ SP: [], SG: [], SE: [] });

    // Gerar e armazenar relatório diário
    const report = generateDailyReport();
    setDailyReports((prev) => [...prev, { date: new Date(currentTime).setHours(0, 0, 0, 0), ...report }]);

    setIsOpen(false);
  };

  // Emitir uma senha (do totem - AC)
  const issueTicket = (type) => {
    if (!isOpen) return alert('Expediente fechado.');
    const seq = sequences[type];
    const number = generateTicketNumber(type, seq, currentTime);
    const ticket = {
      number,
      type,
      issueTime: new Date(currentTime),
      attendanceTime: null,
      finishTime: null,
      guiche: null,
    };
    setSequences((prev) => ({ ...prev, [type]: seq + 1 }));
    setQueues((prev) => ({ ...prev, [type]: [...prev[type], ticket] }));
    setIssuedTickets((prev) => [...prev, ticket]);

    // 5% de chance de descartar imediatamente (não comparecimento)
    if (Math.random() < 0.05) {
      setDiscardedTickets((prev) => [...prev, ticket]);
      setQueues((prev) => ({ ...prev, [type]: prev[type].filter((t) => t.number !== number) }));
    }
  };

  // Função para enviar notificação com som
  const sendNotification = (title, body) => {
    if (notificationPermission === 'granted') {
      new Notification(title, { body });
      const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
      audio.play();
    } else if (notificationPermission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification(title, { body });
          const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
          audio.play();
        }
      });
    }
  };

  // Chamar próxima senha (do AA)
  const callNext = (guicheId) => {
    if (!isOpen) return alert('Expediente fechado.');
    const guiche = guiches.find((g) => g.id === guicheId);
    if (guiche.currentTicket) return alert('Guichê ocupado.');

    let nextType;
    if (lastPriority === 'SP' || !lastPriority) {
      // Próximo non-SP: preferir SE se disponível, senão SG
      nextType = queues.SE.length > 0 ? 'SE' : queues.SG.length > 0 ? 'SG' : null;
    } else {
      // Próximo SP se disponível
      nextType = queues.SP.length > 0 ? 'SP' : null;
    }

    // Fallback se não houver o preferido, tentar respeitar alternância
    if (!nextType) {
      if (lastPriority === 'SP') {
        nextType = queues.SG.length > 0 ? 'SG' : queues.SE.length > 0 ? 'SE' : queues.SP.length > 0 ? 'SP' : null;
      } else {
        nextType = queues.SP.length > 0 ? 'SP' : queues.SE.length > 0 ? 'SE' : queues.SG.length > 0 ? 'SG' : null;
      }
    }

    if (!nextType) return alert('Nenhuma senha na fila.');

    const ticket = queues[nextType].shift();
    const attendanceDuration = getAttendanceTime(nextType);
    const endTime = currentTime.getTime() + attendanceDuration;

    setQueues((prev) => ({ ...prev, [nextType]: [...prev[nextType]] }));
    setGuiches((prev) =>
      prev.map((g) =>
        g.id === guicheId ? { ...g, currentTicket: ticket, endTime } : g
      )
    );
    setLastPriority(nextType === 'SE' || nextType === 'SG' ? 'non-SP' : 'SP');

    // Atualizar detalhes da senha
    ticket.attendanceTime = new Date(currentTime);
    ticket.guiche = guicheId;
    setAttendedTickets((prev) => [...prev, ticket]);

    // Atualizar últimas chamadas (manter apenas as 5 últimas)
    const callInfo = { number: ticket.number, guiche: guicheId, time: new Date(currentTime) };
    setLastCalls((prev) => [callInfo, ...prev].slice(0, 5));

    // Enviar notificação para o cliente com som
    sendNotification('Senha Chamada', `Sua senha ${ticket.number} foi chamada no guichê ${guicheId}.`);
  };

  // Finalizar atendimento (automático ou manual)
  const finishAttendance = (guicheId) => {
    setGuiches((prev) =>
      prev.map((g) => {
        if (g.id === guicheId && g.currentTicket) {
          g.currentTicket.finishTime = new Date(currentTime);
        }
        return g.id === guicheId ? { ...g, currentTicket: null, endTime: null } : g;
      })
    );
  };

  // Gerar relatório diário
  const generateDailyReport = () => {
    const totalIssued = issuedTickets.length;
    const totalAttended = attendedTickets.filter((t) => !!t.finishTime).length;
    const byTypeIssued = { SP: 0, SG: 0, SE: 0 };
    const byTypeAttended = { SP: 0, SG: 0, SE: 0 };
    issuedTickets.forEach((t) => byTypeIssued[t.type]++);
    attendedTickets.forEach((t) => {
      if (t.finishTime) byTypeAttended[t.type]++;
    });

    // Relatório detalhado de todas as senhas emitidas
    const detailed = issuedTickets.map((t) => ({
      number: t.number,
      type: t.type,
      issueTime: t.issueTime.toLocaleString(),
      attendanceTime: t.attendanceTime ? t.attendanceTime.toLocaleString() : '',
      guiche: t.guiche || '',
    }));

    // Cálculo do TM médio por tipo (tempo de atendimento real)
    const tmSums = { SP: 0, SG: 0, SE: 0 };
    const tmCounts = { SP: 0, SG: 0, SE: 0 };
    attendedTickets.forEach((t) => {
      if (t.finishTime && t.attendanceTime) {
        const duration = (t.finishTime.getTime() - t.attendanceTime.getTime()) / (60 * 1000); // em minutos
        tmSums[t.type] += duration;
        tmCounts[t.type]++;
      }
    });
    const tmByType = {};
    Object.keys(tmSums).forEach((type) => {
      tmByType[type] = tmCounts[type] > 0 ? (tmSums[type] / tmCounts[type]).toFixed(2) : '0.00';
    });

    return {
      totalIssued,
      totalAttended,
      byTypeIssued,
      byTypeAttended,
      detailed,
      tmByType,
      tmSums,
      tmCounts,
    };
  };

  // Gerar relatório mensal (agregando diários do mês atual)
  const generateMonthlyReport = () => {
    const currentMonth = currentTime.getMonth();
    const monthReports = dailyReports.filter((r) => new Date(r.date).getMonth() === currentMonth);

    if (monthReports.length === 0) return null;

    let totalIssued = 0;
    let totalAttended = 0;
    const byTypeIssued = { SP: 0, SG: 0, SE: 0 };
    const byTypeAttended = { SP: 0, SG: 0, SE: 0 };
    const tmSums = { SP: 0, SG: 0, SE: 0 };
    const tmCounts = { SP: 0, SG: 0, SE: 0 };
    let detailed = [];

    monthReports.forEach((r) => {
      if (!r || !r.byTypeIssued || !r.byTypeAttended || !r.tmByType || !r.tmSums || !r.tmCounts) {
        return; // Ignora relatórios inválidos
      }
      totalIssued += r.totalIssued;
      totalAttended += r.totalAttended;
      Object.keys(byTypeIssued).forEach((type) => {
        byTypeIssued[type] += r.byTypeIssued[type] || 0;
        byTypeAttended[type] += r.byTypeAttended[type] || 0;
        tmSums[type] += (r.tmSums && r.tmSums[type]) || 0;
        tmCounts[type] += (r.tmCounts && r.tmCounts[type]) || 0;
      });
      detailed = [...detailed, ...r.detailed];
    });

    const tmByType = {};
    Object.keys(tmSums).forEach((type) => {
      tmByType[type] = tmCounts[type] > 0 ? (tmSums[type] / tmCounts[type]).toFixed(2) : '0.00';
    });

    return {
      totalIssued,
      totalAttended,
      byTypeIssued,
      byTypeAttended,
      detailed,
      tmByType,
    };
  };

  const dailyReport = generateDailyReport();
  const monthlyReport = generateMonthlyReport();

  return (
    <div className="App">
      <h1>Sistema de Controle de Atendimento</h1>
      <p>Horário Atual: {currentTime.toLocaleString()}</p>
      <button onClick={openOffice} disabled={isOpen}>Iniciar Expediente (7h)</button>
      <button onClick={closeOffice} disabled={!isOpen}>Encerrar Expediente (17h)</button>

      <h2>Totem (Agente Cliente - AC)</h2>
      <button onClick={() => issueTicket('SP')}>Emitir Senha Prioritária (SP)</button>
      <button onClick={() => issueTicket('SG')}>Emitir Senha Geral (SG)</button>
      <button onClick={() => issueTicket('SE')}>Emitir Senha Exames (SE)</button>

      <h2>Guichês (Agente Atendente - AA)</h2>
      {guiches.map((g) => (
        <div key={g.id}>
          <h3>Guichê {g.id}</h3>
          <p>Atual: {g.currentTicket ? g.currentTicket.number : 'Livre'}</p>
          <button onClick={() => callNext(g.id)} disabled={!!g.currentTicket || !isOpen}>Chamar Próximo</button>
          <button onClick={() => finishAttendance(g.id)} disabled={!g.currentTicket}>Finalizar Atendimento</button>
        </div>
      ))}

      <h2>Painel de Chamados (Últimas 5)</h2>
      <ul>
        {lastCalls.map((call, idx) => (
          <li key={idx}>
            Senha: {call.number} - Guichê: {call.guiche} - Hora: {call.time.toLocaleTimeString()}
          </li>
        ))}
      </ul>

      <h2>Filas de Espera (Visual)</h2>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div>
          <h3>Senha Prioritária (SP) - {queues.SP.length} esperando</h3>
          <ul>
            {queues.SP.map((t, idx) => (
              <li key={idx}>{t.number} - Emitida em: {t.issueTime.toLocaleTimeString()}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Senha Geral (SG) - {queues.SG.length} esperando</h3>
          <ul>
            {queues.SG.map((t, idx) => (
              <li key={idx}>{t.number} - Emitida em: {t.issueTime.toLocaleTimeString()}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Senha Exames (SE) - {queues.SE.length} esperando</h3>
          <ul>
            {queues.SE.map((t, idx) => (
              <li key={idx}>{t.number} - Emitida em: {t.issueTime.toLocaleTimeString()}</li>
            ))}
          </ul>
        </div>
      </div>

      <h2>Relatório Diário</h2>
      <p>Quantitativo Geral Emitidas: {dailyReport.totalIssued}</p>
      <p>Quantitativo Geral Atendidas: {dailyReport.totalAttended}</p>
      <p>Quantitativo Emitidas por Prioridade: SP: {dailyReport.byTypeIssued.SP}, SG: {dailyReport.byTypeIssued.SG}, SE: {dailyReport.byTypeIssued.SE}</p>
      <p>Quantitativo Atendidas por Prioridade: SP: {dailyReport.byTypeAttended.SP}, SG: {dailyReport.byTypeAttended.SG}, SE: {dailyReport.byTypeAttended.SE}</p>
      <p>TM Médio (min): SP: {dailyReport.tmByType.SP}, SG: {dailyReport.tmByType.SG}, SE: {dailyReport.tmByType.SE}</p>
      <h3>Relatório Detalhado</h3>
      <table>
        <thead>
          <tr>
            <th>Numeração</th>
            <th>Tipo</th>
            <th>Data/Hora Emissão</th>
            <th>Data/Hora Atendimento</th>
            <th>Guichê</th>
          </tr>
        </thead>
        <tbody>
          {dailyReport.detailed.map((d, idx) => (
            <tr key={idx}>
              <td>{d.number}</td>
              <td>{d.type}</td>
              <td>{d.issueTime}</td>
              <td>{d.attendanceTime}</td>
              <td>{d.guiche}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Relatório Mensal</h2>
      <button onClick={() => setShowMonthlyReport(!showMonthlyReport)}>
        {showMonthlyReport ? 'Esconder Relatório Mensal' : 'Mostrar Relatório Mensal'}
      </button>
      {showMonthlyReport && monthlyReport && (
        <div>
          <p>Quantitativo Geral Emitidas: {monthlyReport.totalIssued}</p>
          <p>Quantitativo Geral Atendidas: {monthlyReport.totalAttended}</p>
          <p>Quantitativo Emitidas por Prioridade: SP: {monthlyReport.byTypeIssued.SP}, SG: {monthlyReport.byTypeIssued.SG}, SE: {monthlyReport.byTypeIssued.SE}</p>
          <p>Quantitativo Atendidas por Prioridade: SP: {monthlyReport.byTypeAttended.SP}, SG: {monthlyReport.byTypeAttended.SG}, SE: {monthlyReport.byTypeAttended.SE}</p>
          <p>TM Médio (min): SP: {monthlyReport.tmByType.SP}, SG: {monthlyReport.tmByType.SG}, SE: {monthlyReport.tmByType.SE}</p>
          <h3>Relatório Detalhado</h3>
          <table>
            <thead>
              <tr>
                <th>Numeração</th>
                <th>Tipo</th>
                <th>Data/Hora Emissão</th>
                <th>Data/Hora Atendimento</th>
                <th>Guichê</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReport.detailed.map((d, idx) => (
                <tr key={idx}>
                  <td>{d.number}</td>
                  <td>{d.type}</td>
                  <td>{d.issueTime}</td>
                  <td>{d.attendanceTime}</td>
                  <td>{d.guiche}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
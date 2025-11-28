// App.js - Ponto de entrada principal para o aplicativo React // Este comentário descreve o arquivo como ponto de entrada principal.
import React, { useState, useEffect } from 'react'; // Importa o React e hooks específicos (useState e useEffect) da biblioteca react.
import './App.css'; // Importa o arquivo de estilos CSS associado ao componente App.

// Utilitário para gerar número de senha: YYMMDD-PPSQ // Comentário descrevendo a função utilitária para gerar números de senha no formato especificado.
const generateTicketNumber = (type, sequence, date) => { // Define uma função constante que recebe tipo, sequência e data para gerar o número da senha.
  const yy = date.getFullYear().toString().slice(-2); // Extrai os dois últimos dígitos do ano da data fornecida.
  const mm = (date.getMonth() + 1).toString().padStart(2, '0'); // Obtém o mês (adiciona 1 pois getMonth começa em 0) e formata com dois dígitos, adicionando zero à esquerda se necessário.
  const dd = date.getDate().toString().padStart(2, '0'); // Obtém o dia do mês e formata com dois dígitos, adicionando zero à esquerda se necessário.
  const pp = type; // Atribui o tipo de senha (SP, SG ou SE) à variável pp.
  const sq = sequence.toString().padStart(2, '0'); // Converte a sequência para string e formata com dois dígitos, adicionando zero à esquerda se necessário.
  return `${yy}${mm}${dd}-${pp}${sq}`; // Retorna a string formatada como número de senha no padrão YYMMDD-PPSQ.
}; // Fecha a definição da função generateTicketNumber.

// Utilitário para obter variação aleatória para TM // Comentário descrevendo a função utilitária para calcular tempo de atendimento com variações aleatórias.
const getAttendanceTime = (type) => { // Define uma função constante que recebe o tipo de senha e retorna o tempo de atendimento em milissegundos.
  let baseTime; // Declara uma variável para armazenar o tempo base de atendimento.
  if (type === 'SP') { // Verifica se o tipo é 'SP' (Senha Prioritária).
    baseTime = 15 * 60 * 1000; // Define o tempo base como 15 minutos convertidos para milissegundos. // 15 min em ms
    const variation = (Math.random() * 10 - 5) * 60 * 1000; // Calcula uma variação aleatória entre -5 e +5 minutos, convertida para milissegundos. // +/- 5 min em distribuição igual
    return baseTime + variation; // Retorna o tempo base somado à variação para tipo SP.
  } else if (type === 'SG') { // Verifica se o tipo é 'SG' (Senha Geral).
    baseTime = 5 * 60 * 1000; // Define o tempo base como 5 minutos convertidos para milissegundos. // 5 min
    const variation = (Math.random() * 6 - 3) * 60 * 1000; // Calcula uma variação aleatória entre -3 e +3 minutos, convertida para milissegundos. // +/- 3 min em proporção igual
    return baseTime + variation; // Retorna o tempo base somado à variação para tipo SG.
  } else if (type === 'SE') { // Verifica se o tipo é 'SE' (Senha Exames).
    const isLong = Math.random() < 0.05; // Gera um booleano com 5% de chance de ser true para atendimento longo. // 5% de chance de 5 min
    return isLong ? 5 * 60 * 1000 : 1 * 60 * 1000; // Retorna 5 minutos se isLong for true, caso contrário 1 minuto, ambos em milissegundos. // 95% 1 min, 5% 5 min
  } // Fecha o bloco if para tipo SE.
  return 0; // Retorna 0 se nenhum tipo corresponder (caso de erro).
}; // Fecha a definição da função getAttendanceTime.

// Componente principal do App // Comentário descrevendo o componente principal da aplicação.
function App() { // Define o componente funcional principal chamado App.
  const [queues, setQueues] = useState({ SP: [], SG: [], SE: [] }); // Cria estado para as filas de cada tipo de senha, inicializado como objetos com arrays vazios. // Filas para cada tipo de senha
  const [sequences, setSequences] = useState({ SP: 1, SG: 1, SE: 1 }); // Cria estado para as sequências numéricas diárias por tipo, inicializado em 1 para cada. // Sequências diárias por tipo
  const [currentTime, setCurrentTime] = useState(new Date(2025, 10, 21, 7, 0)); // Cria estado para o tempo simulado, inicializado em 21/11/2025 às 7:00. // Tempo simulado iniciando às 7h em 21/11/2025
  const [isOpen, setIsOpen] = useState(false); // Cria estado booleano para indicar se o expediente está aberto, inicializado como false. // Expediente está aberto?
  const [guiches, setGuiches] = useState([ // Cria estado para os guichês, inicializado como array de objetos representando 3 guichês.
    { id: 1, currentTicket: null, endTime: null }, // Objeto para guichê 1, com senha atual nula e tempo de fim nulo.
    { id: 2, currentTicket: null, endTime: null }, // Objeto para guichê 2, com senha atual nula e tempo de fim nulo.
    { id: 3, currentTicket: null, endTime: null }, // Objeto para guichê 3, com senha atual nula e tempo de fim nulo.
  ]); // Fecha o array de inicialização dos guichês. // 3 guichês
  const [lastCalls, setLastCalls] = useState([]); // Cria estado para as últimas chamadas, inicializado como array vazio. // Últimas 5 chamadas
  const [issuedTickets, setIssuedTickets] = useState([]); // Cria estado para todas as senhas emitidas, inicializado como array vazio. // Todas as senhas emitidas com detalhes
  const [attendedTickets, setAttendedTickets] = useState([]); // Cria estado para senhas atendidas, inicializado como array vazio. // Senhas atendidas
  const [discardedTickets, setDiscardedTickets] = useState([]); // Cria estado para senhas descartadas, inicializado como array vazio. // Senhas descartadas (5% ou fim do dia)
  const [lastPriority, setLastPriority] = useState(null); // Cria estado para o tipo da última prioridade chamada, inicializado como null. // Tipo de prioridade da última chamada (para alternância SP vs non-SP)
  const [dailyReports, setDailyReports] = useState([]); // Cria estado para relatórios diários, inicializado como array vazio. // Relatórios diários para agregação mensal
  const [showMonthlyReport, setShowMonthlyReport] = useState(false); // Cria estado booleano para mostrar relatório mensal, inicializado como false. // Mostrar relatório mensal?
  const [notificationPermission, setNotificationPermission] = useState('default'); // Cria estado para permissão de notificações, inicializado como 'default'. // Permissão para notificações

  // Solicitar permissão para notificações ao montar o componente // Comentário descrevendo o efeito para solicitar permissão de notificações.
  useEffect(() => { // Define um hook useEffect que executa ao montar o componente (array de dependências vazio).
    if ('Notification' in window) { // Verifica se a API de Notification está disponível no navegador.
      Notification.requestPermission().then((permission) => { // Solicita permissão para notificações e trata a resposta em uma promise.
        setNotificationPermission(permission); // Atualiza o estado com a permissão concedida.
      }); // Fecha o then da promise.
    } // Fecha o if para verificação de Notification.
  }, []); // Array de dependências vazio, executa apenas uma vez ao montar.

  // Simular passagem do tempo a cada segundo // Comentário descrevendo o efeito para simular o tempo.
  useEffect(() => { // Define um hook useEffect para simular a passagem do tempo.
    const interval = setInterval(() => { // Cria um intervalo que executa a cada 1000ms (1 segundo).
      setCurrentTime((prev) => new Date(prev.getTime() + 1000)); // Atualiza o tempo atual adicionando 1 segundo ao tempo anterior. // Avançar 1 segundo
    }, 1000); // Define o intervalo como 1000ms.
    return () => clearInterval(interval); // Retorna uma função de cleanup para limpar o intervalo ao desmontar.
  }, []); // Array de dependências vazio, executa apenas uma vez ao montar.

  // Verificar fechamento automático baseado no horário // Comentário descrevendo o efeito para verificar fechamento automático.
  useEffect(() => { // Define um hook useEffect que reage a mudanças em currentTime e isOpen.
    const now = currentTime; // Atribui o tempo atual a uma variável.
    const today5pm = new Date(now); // Cria uma nova data baseada no tempo atual.
    today5pm.setHours(17, 0, 0, 0); // Define a data para 17:00:00:000 do dia atual.

    if (now >= today5pm && isOpen) { // Verifica se o tempo atual é igual ou posterior a 17h e se o expediente está aberto.
      closeOffice(); // Chama a função para fechar o expediente.
    } // Fecha o if de verificação.
  }, [currentTime, isOpen]); // Dependências: executa sempre que currentTime ou isOpen mudam.

  // Manipular timers dos guichês para finalização automática do atendimento // Comentário descrevendo o efeito para manipular timers dos guichês.
  useEffect(() => { // Define um hook useEffect para verificar finalização de atendimentos.
    const interval = setInterval(() => { // Cria um intervalo que executa a cada 1000ms.
      const nowMs = currentTime.getTime(); // Obtém o tempo atual em milissegundos.
      setGuiches((prev) => // Atualiza o estado dos guichês.
        prev.map((g) => { // Mapeia cada guichê anterior.
          if (g.currentTicket && g.endTime <= nowMs) { // Verifica se há senha atual e se o tempo de fim chegou.
            finishAttendance(g.id); // Chama a função para finalizar o atendimento no guichê.
          } // Fecha o if de verificação.
          return g; // Retorna o guichê (possivelmente modificado).
        }) // Fecha o map.
      ); // Fecha o setGuiches.
    }, 1000); // Define o intervalo como 1000ms.
    return () => clearInterval(interval); // Retorna cleanup para limpar o intervalo.
  }, [currentTime]); // Dependência: executa quando currentTime muda (mas o intervalo é contínuo).

  // Abrir expediente // Comentário descrevendo a função para abrir o expediente.
  const openOffice = () => { // Define a função para abrir o expediente.
    setIsOpen(true); // Atualiza o estado para indicar que o expediente está aberto.
    setSequences({ SP: 1, SG: 1, SE: 1 }); // Reseta as sequências para 1 em cada tipo. // Resetar sequências diariamente
    setIssuedTickets([]); // Limpa o array de senhas emitidas.
    setAttendedTickets([]); // Limpa o array de senhas atendidas.
    setDiscardedTickets([]); // Limpa o array de senhas descartadas.
    setLastCalls([]); // Limpa o array de últimas chamadas.
    setQueues({ SP: [], SG: [], SE: [] }); // Reseta as filas para arrays vazios.
    setLastPriority(null); // Reseta a última prioridade para null.
  }; // Fecha a função openOffice.

  // Fechar expediente e descartar senhas restantes // Comentário descrevendo a função para fechar o expediente.
  const closeOffice = () => { // Define a função para fechar o expediente.
    // Finalizar atendimentos em andamento // Comentário interno: finaliza atendimentos em andamento.
    setGuiches((prev) => // Atualiza os guichês.
      prev.map((g) => { // Mapeia cada guichê.
        if (g.currentTicket) { // Verifica se há senha atual no guichê.
          g.currentTicket.finishTime = new Date(currentTime); // Define o tempo de finalização da senha atual.
        } // Fecha o if.
        return { ...g, currentTicket: null, endTime: null }; // Retorna o guichê limpo, sem senha atual ou tempo de fim.
      }) // Fecha o map.
    ); // Fecha o setGuiches.

    // Descartar senhas restantes nas filas // Comentário interno: descarta senhas restantes.
    const remaining = [...queues.SP, ...queues.SG, ...queues.SE]; // Concatena todas as senhas restantes das filas.
    setDiscardedTickets((prev) => [...prev, ...remaining]); // Adiciona as restantes às descartadas.
    setQueues({ SP: [], SG: [], SE: [] }); // Limpa as filas.

    // Gerar e armazenar relatório diário // Comentário interno: gera e armazena relatório diário.
    const report = generateDailyReport(); // Gera o relatório diário chamando a função correspondente.
    setDailyReports((prev) => [...prev, { date: new Date(currentTime).setHours(0, 0, 0, 0), ...report }]); // Adiciona o relatório ao array de relatórios diários, com data normalizada.

    setIsOpen(false); // Atualiza o estado para indicar que o expediente está fechado.
  }; // Fecha a função closeOffice.

  // Emitir uma senha (do totem - AC) // Comentário descrevendo a função para emitir senha.
  const issueTicket = (type) => { // Define a função para emitir uma senha, recebendo o tipo.
    if (!isOpen) return alert('Expediente fechado.'); // Verifica se o expediente está aberto; se não, alerta e retorna.
    const seq = sequences[type]; // Obtém a sequência atual para o tipo.
    const number = generateTicketNumber(type, seq, currentTime); // Gera o número da senha usando a função utilitária.
    const ticket = { // Cria um objeto de senha com detalhes.
      number, // Número gerado.
      type, // Tipo da senha.
      issueTime: new Date(currentTime), // Tempo de emissão baseado no tempo atual.
      attendanceTime: null, // Tempo de atendimento inicializado como null.
      finishTime: null, // Tempo de finalização inicializado como null.
      guiche: null, // Guichê inicializado como null.
    }; // Fecha o objeto ticket.
    setSequences((prev) => ({ ...prev, [type]: seq + 1 })); // Incrementa a sequência para o tipo.
    setQueues((prev) => ({ ...prev, [type]: [...prev[type], ticket] })); // Adiciona a senha à fila correspondente.
    setIssuedTickets((prev) => [...prev, ticket]); // Adiciona a senha às emitidas.

    // 5% de chance de descartar imediatamente (não comparecimento) // Comentário interno: chance de descarte imediato.
    if (Math.random() < 0.05) { // Gera aleatório e verifica se é menor que 0.05 (5%).
      setDiscardedTickets((prev) => [...prev, ticket]); // Adiciona a senha às descartadas.
      setQueues((prev) => ({ ...prev, [type]: prev[type].filter((t) => t.number !== number) })); // Remove a senha da fila.
    } // Fecha o if de descarte.
  }; // Fecha a função issueTicket.

  // Função para enviar notificação com som // Comentário descrevendo a função para enviar notificação.
  const sendNotification = (title, body) => { // Define a função para enviar notificação, recebendo título e corpo.
    if (notificationPermission === 'granted') { // Verifica se a permissão é concedida.
      new Notification(title, { body }); // Cria e exibe a notificação.
      const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3'); // Cria um objeto de áudio com URL de som.
      audio.play(); // Toca o som.
    } else if (notificationPermission === 'default') { // Verifica se a permissão é padrão (não decidida).
      Notification.requestPermission().then((permission) => { // Solicita permissão novamente.
        setNotificationPermission(permission); // Atualiza o estado com a nova permissão.
        if (permission === 'granted') { // Se concedida agora.
          new Notification(title, { body }); // Cria e exibe a notificação.
          const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3'); // Cria o áudio novamente.
          audio.play(); // Toca o som.
        } // Fecha o if interno.
      }); // Fecha o then.
    } // Fecha o else if.
  }; // Fecha a função sendNotification.

  // Chamar próxima senha (do AA) // Comentário descrevendo a função para chamar próxima senha.
  const callNext = (guicheId) => { // Define a função para chamar a próxima senha, recebendo ID do guichê.
    if (!isOpen) return alert('Expediente fechado.'); // Verifica se aberto; alerta e retorna se não.
    const guiche = guiches.find((g) => g.id === guicheId); // Encontra o guichê pelo ID.
    if (guiche.currentTicket) return alert('Guichê ocupado.'); // Verifica se guichê está ocupado; alerta e retorna se sim.

    let nextType; // Declara variável para o próximo tipo de senha.
    if (lastPriority === 'SP' || !lastPriority) { // Verifica se última prioridade foi SP ou nenhuma.
      // Próximo non-SP: preferir SE se disponível, senão SG // Comentário interno: prefere non-SP.
      nextType = queues.SE.length > 0 ? 'SE' : queues.SG.length > 0 ? 'SG' : null; // Define nextType priorizando SE, depois SG.
    } else { // Caso contrário (última foi non-SP).
      // Próximo SP se disponível // Comentário interno: prefere SP.
      nextType = queues.SP.length > 0 ? 'SP' : null; // Define nextType como SP se disponível.
    } // Fecha o else.

    // Fallback se não houver o preferido, tentar respeitar alternância // Comentário interno: fallback para alternância.
    if (!nextType) { // Se nextType ainda null.
      if (lastPriority === 'SP') { // Se última foi SP.
        nextType = queues.SG.length > 0 ? 'SG' : queues.SE.length > 0 ? 'SE' : queues.SP.length > 0 ? 'SP' : null; // Prioriza SG, SE, SP.
      } else { // Caso contrário.
        nextType = queues.SP.length > 0 ? 'SP' : queues.SE.length > 0 ? 'SE' : queues.SG.length > 0 ? 'SG' : null; // Prioriza SP, SE, SG.
      } // Fecha o else interno.
    } // Fecha o if de fallback.

    if (!nextType) return alert('Nenhuma senha na fila.'); // Se ainda null, alerta e retorna.

    const ticket = queues[nextType].shift(); // Remove e obtém a primeira senha da fila do tipo escolhido.
    const attendanceDuration = getAttendanceTime(nextType); // Calcula a duração do atendimento usando a função utilitária.
    const endTime = currentTime.getTime() + attendanceDuration; // Calcula o tempo de fim somando duração ao tempo atual.

    setQueues((prev) => ({ ...prev, [nextType]: [...prev[nextType]] })); // Atualiza as filas, removendo a senha chamada.
    setGuiches((prev) => // Atualiza os guichês.
      prev.map((g) => // Mapeia cada guichê.
        g.id === guicheId ? { ...g, currentTicket: ticket, endTime } : g // Atribui a senha e endTime ao guichê correto, senão retorna inalterado.
      ) // Fecha o map.
    ); // Fecha o setGuiches.
    setLastPriority(nextType === 'SE' || nextType === 'SG' ? 'non-SP' : 'SP'); // Atualiza a última prioridade: non-SP para SE/SG, SP para SP.

    // Atualizar detalhes da senha // Comentário interno: atualiza detalhes da senha.
    ticket.attendanceTime = new Date(currentTime); // Define o tempo de atendimento.
    ticket.guiche = guicheId; // Define o guichê.
    setAttendedTickets((prev) => [...prev, ticket]); // Adiciona à lista de atendidas.

    // Atualizar últimas chamadas (manter apenas as 5 últimas) // Comentário interno: atualiza últimas chamadas.
    const callInfo = { number: ticket.number, guiche: guicheId, time: new Date(currentTime) }; // Cria objeto com info da chamada.
    setLastCalls((prev) => [callInfo, ...prev].slice(0, 5)); // Adiciona no início e mantém apenas 5.

    // Enviar notificação para o cliente com som // Comentário interno: envia notificação.
    sendNotification('Senha Chamada', `Sua senha ${ticket.number} foi chamada no guichê ${guicheId}.`); // Chama a função de notificação.
  }; // Fecha a função callNext.

  // Finalizar atendimento (automático ou manual) // Comentário descrevendo a função para finalizar atendimento.
  const finishAttendance = (guicheId) => { // Define a função para finalizar atendimento, recebendo ID do guichê.
    setGuiches((prev) => // Atualiza os guichês.
      prev.map((g) => { // Mapeia cada guichê.
        if (g.id === guicheId && g.currentTicket) { // Verifica se é o guichê correto e tem senha atual.
          g.currentTicket.finishTime = new Date(currentTime); // Define o tempo de finalização da senha.
        } // Fecha o if.
        return g.id === guicheId ? { ...g, currentTicket: null, endTime: null } : g; // Limpa o guichê correto, senão retorna inalterado.
      }) // Fecha o map.
    ); // Fecha o setGuiches.
  }; // Fecha a função finishAttendance.

  // Gerar relatório diário // Comentário descrevendo a função para gerar relatório diário.
  const generateDailyReport = () => { // Define a função para gerar relatório diário.
    const totalIssued = issuedTickets.length; // Calcula o total de senhas emitidas.
    const totalAttended = attendedTickets.filter((t) => !!t.finishTime).length; // Calcula o total de atendidas (com finishTime definido).
    const byTypeIssued = { SP: 0, SG: 0, SE: 0 }; // Inicializa contadores de emitidas por tipo.
    const byTypeAttended = { SP: 0, SG: 0, SE: 0 }; // Inicializa contadores de atendidas por tipo.
    issuedTickets.forEach((t) => byTypeIssued[t.type]++); // Incrementa contadores de emitidas por tipo.
    attendedTickets.forEach((t) => { // Percorre as atendidas.
      if (t.finishTime) byTypeAttended[t.type]++; // Incrementa se finalizada.
    }); // Fecha o forEach.

    // Relatório detalhado de todas as senhas emitidas // Comentário interno: cria relatório detalhado.
    const detailed = issuedTickets.map((t) => ({ // Mapeia cada senha emitida para um objeto detalhado.
      number: t.number, // Número da senha.
      type: t.type, // Tipo.
      issueTime: t.issueTime.toLocaleString(), // Tempo de emissão formatado.
      attendanceTime: t.attendanceTime ? t.attendanceTime.toLocaleString() : '', // Tempo de atendimento formatado ou vazio.
      guiche: t.guiche || '', // Guichê ou vazio.
    })); // Fecha o map.

    // Cálculo do TM médio por tipo (tempo de atendimento real) // Comentário interno: calcula tempo médio (TM).
    const tmSums = { SP: 0, SG: 0, SE: 0 }; // Inicializa somas de durations por tipo.
    const tmCounts = { SP: 0, SG: 0, SE: 0 }; // Inicializa contadores por tipo.
    attendedTickets.forEach((t) => { // Percorre as atendidas.
      if (t.finishTime && t.attendanceTime) { // Verifica se tem tempos de atendimento e finalização.
        const duration = (t.finishTime.getTime() - t.attendanceTime.getTime()) / (60 * 1000); // Calcula duração em minutos. // em minutos
        tmSums[t.type] += duration; // Soma a duração.
        tmCounts[t.type]++; // Incrementa o contador.
      } // Fecha o if.
    }); // Fecha o forEach.
    const tmByType = {}; // Inicializa objeto para TM por tipo.
    Object.keys(tmSums).forEach((type) => { // Percorre as chaves de tmSums.
      tmByType[type] = tmCounts[type] > 0 ? (tmSums[type] / tmCounts[type]).toFixed(2) : '0.00'; // Calcula média com 2 decimais ou 0.00.
    }); // Fecha o forEach.

    return { // Retorna o objeto de relatório diário.
      totalIssued, // Total emitidas.
      totalAttended, // Total atendidas.
      byTypeIssued, // Por tipo emitidas.
      byTypeAttended, // Por tipo atendidas.
      detailed, // Detalhado.
      tmByType, // TM por tipo.
      tmSums, // Somas de TM (para agregação).
      tmCounts, // Contadores de TM (para agregação).
    }; // Fecha o return.
  }; // Fecha a função generateDailyReport.

  // Gerar relatório mensal (agregando diários do mês atual) // Comentário descrevendo a função para gerar relatório mensal.
  const generateMonthlyReport = () => { // Define a função para gerar relatório mensal.
    const currentMonth = currentTime.getMonth(); // Obtém o mês atual.
    const monthReports = dailyReports.filter((r) => new Date(r.date).getMonth() === currentMonth); // Filtra relatórios do mês atual.

    if (monthReports.length === 0) return null; // Retorna null se não houver relatórios.

    let totalIssued = 0; // Inicializa total emitidas mensal.
    let totalAttended = 0; // Inicializa total atendidas mensal.
    const byTypeIssued = { SP: 0, SG: 0, SE: 0 }; // Inicializa por tipo emitidas.
    const byTypeAttended = { SP: 0, SG: 0, SE: 0 }; // Inicializa por tipo atendidas.
    const tmSums = { SP: 0, SG: 0, SE: 0 }; // Inicializa somas de TM.
    const tmCounts = { SP: 0, SG: 0, SE: 0 }; // Inicializa contadores de TM.
    let detailed = []; // Inicializa array detalhado mensal.

    monthReports.forEach((r) => { // Percorre os relatórios do mês.
      if (!r || !r.byTypeIssued || !r.byTypeAttended || !r.tmByType || !r.tmSums || !r.tmCounts) { // Verifica se o relatório é válido.
        return; // Pula se inválido. // Ignora relatórios inválidos
      } // Fecha o if.
      totalIssued += r.totalIssued; // Soma total emitidas.
      totalAttended += r.totalAttended; // Soma total atendidas.
      Object.keys(byTypeIssued).forEach((type) => { // Percorre tipos.
        byTypeIssued[type] += r.byTypeIssued[type] || 0; // Soma emitidas por tipo.
        byTypeAttended[type] += r.byTypeAttended[type] || 0; // Soma atendidas por tipo.
        tmSums[type] += (r.tmSums && r.tmSums[type]) || 0; // Soma TM sums.
        tmCounts[type] += (r.tmCounts && r.tmCounts[type]) || 0; // Soma TM counts.
      }); // Fecha o forEach interno.
      detailed = [...detailed, ...r.detailed]; // Concatena os detalhados.
    }); // Fecha o forEach principal.

    const tmByType = {}; // Inicializa TM por tipo mensal.
    Object.keys(tmSums).forEach((type) => { // Percorre tipos.
      tmByType[type] = tmCounts[type] > 0 ? (tmSums[type] / tmCounts[type]).toFixed(2) : '0.00'; // Calcula média mensal.
    }); // Fecha o forEach.

    return { // Retorna o objeto de relatório mensal.
      totalIssued, // Total emitidas.
      totalAttended, // Total atendidas.
      byTypeIssued, // Por tipo emitidas.
      byTypeAttended, // Por tipo atendidas.
      detailed, // Detalhado.
      tmByType, // TM por tipo.
    }; // Fecha o return.
  }; // Fecha a função generateMonthlyReport.

  const dailyReport = generateDailyReport(); // Gera o relatório diário atual e atribui a uma constante.
  const monthlyReport = generateMonthlyReport(); // Gera o relatório mensal atual e atribui a uma constante.

  return ( // Inicia o retorno do JSX do componente.
    <div className="App"> // Div principal com classe App para estilos.
      <h1>Sistema de Controle de Atendimento</h1> // Título principal da aplicação.
      <p>Horário Atual: {currentTime.toLocaleString()}</p> // Parágrafo exibindo o horário atual formatado.
      <button onClick={openOffice} disabled={isOpen}>Iniciar Expediente (7h)</button> // Botão para abrir expediente, desabilitado se já aberto.
      <button onClick={closeOffice} disabled={!isOpen}>Encerrar Expediente (17h)</button> // Botão para fechar expediente, desabilitado se fechado.

      <h2>Totem (Agente Cliente - AC)</h2> // Subtítulo para seção de totem.
      <button onClick={() => issueTicket('SP')}>Emitir Senha Prioritária (SP)</button> // Botão para emitir SP.
      <button onClick={() => issueTicket('SG')}>Emitir Senha Geral (SG)</button> // Botão para emitir SG.
      <button onClick={() => issueTicket('SE')}>Emitir Senha Exames (SE)</button> // Botão para emitir SE.

      <h2>Guichês (Agente Atendente - AA)</h2> // Subtítulo para seção de guichês.
      {guiches.map((g) => ( // Mapeia os guichês para renderizar cada um.
        <div key={g.id}> // Div para cada guichê, com key única.
          <h3>Guichê {g.id}</h3> // Título do guichê com ID.
          <p>Atual: {g.currentTicket ? g.currentTicket.number : 'Livre'}</p> // Parágrafo mostrando senha atual ou 'Livre'.
          <button onClick={() => callNext(g.id)} disabled={!!g.currentTicket || !isOpen}>Chamar Próximo</button> // Botão para chamar próximo, desabilitado se ocupado ou fechado.
          <button onClick={() => finishAttendance(g.id)} disabled={!g.currentTicket}>Finalizar Atendimento</button> // Botão para finalizar, desabilitado se livre.
        </div> // Fecha div do guichê.
      ))} // Fecha o map dos guichês.

      <h2>Painel de Chamados (Últimas 5)</h2> // Subtítulo para painel de últimas chamadas.
      <ul> // Lista não ordenada para chamadas.
        {lastCalls.map((call, idx) => ( // Mapeia as últimas chamadas.
          <li key={idx}> // Item de lista com key baseada no índice.
            Senha: {call.number} - Guichê: {call.guiche} - Hora: {call.time.toLocaleTimeString()} // Conteúdo do item: senha, guichê e hora.
          </li> // Fecha li.
        ))} // Fecha o map.
      </ul> // Fecha ul.

      <h2>Filas de Espera (Visual)</h2> // Subtítulo para filas de espera.
      <div style={{ display: 'flex', justifyContent: 'space-around' }}> // Div com estilo flex para distribuir as filas.
        <div> // Div para fila SP.
          <h3>Senha Prioritária (SP) - {queues.SP.length} esperando</h3> // Título com contagem.
          <ul> // Lista para senhas SP.
            {queues.SP.map((t, idx) => ( // Mapeia senhas SP.
              <li key={idx}>{t.number} - Emitida em: {t.issueTime.toLocaleTimeString()}</li> // Item com número e tempo de emissão.
            ))} // Fecha map.
          </ul> // Fecha ul.
        </div> // Fecha div SP.
        <div> // Div para fila SG.
          <h3>Senha Geral (SG) - {queues.SG.length} esperando</h3> // Título com contagem.
          <ul> // Lista para senhas SG.
            {queues.SG.map((t, idx) => ( // Mapeia senhas SG.
              <li key={idx}>{t.number} - Emitida em: {t.issueTime.toLocaleTimeString()}</li> // Item com número e tempo.
            ))} // Fecha map.
          </ul> // Fecha ul.
        </div> // Fecha div SG.
        <div> // Div para fila SE.
          <h3>Senha Exames (SE) - {queues.SE.length} esperando</h3> // Título com contagem.
          <ul> // Lista para senhas SE.
            {queues.SE.map((t, idx) => ( // Mapeia senhas SE.
              <li key={idx}>{t.number} - Emitida em: {t.issueTime.toLocaleTimeString()}</li> // Item com número e tempo.
            ))} // Fecha map.
          </ul> // Fecha ul.
        </div> // Fecha div SE.
      </div> // Fecha div flex.

      <h2>Relatório Diário</h2> // Subtítulo para relatório diário.
      <p>Quantitativo Geral Emitidas: {dailyReport.totalIssued}</p> // Parágrafo com total emitidas.
      <p>Quantitativo Geral Atendidas: {dailyReport.totalAttended}</p> // Parágrafo com total atendidas.
      <p>Quantitativo Emitidas por Prioridade: SP: {dailyReport.byTypeIssued.SP}, SG: {dailyReport.byTypeIssued.SG}, SE: {dailyReport.byTypeIssued.SE}</p> // Parágrafo com emitidas por tipo.
      <p>Quantitativo Atendidas por Prioridade: SP: {dailyReport.byTypeAttended.SP}, SG: {dailyReport.byTypeAttended.SG}, SE: {dailyReport.byTypeAttended.SE}</p> // Parágrafo com atendidas por tipo.
      <p>TM Médio (min): SP: {dailyReport.tmByType.SP}, SG: {dailyReport.tmByType.SG}, SE: {dailyReport.tmByType.SE}</p> // Parágrafo com TM médio por tipo.
      <h3>Relatório Detalhado</h3> // Subtítulo para detalhado diário.
      <table> // Tabela para relatório detalhado.
        <thead> // Cabeçalho da tabela.
          <tr> // Linha de cabeçalho.
            <th>Numeração</th> // Coluna Numeração.
            <th>Tipo</th> // Coluna Tipo.
            <th>Data/Hora Emissão</th> // Coluna Data/Hora Emissão.
            <th>Data/Hora Atendimento</th> // Coluna Data/Hora Atendimento.
            <th>Guichê</th> // Coluna Guichê.
          </tr> // Fecha tr.
        </thead> // Fecha thead.
        <tbody> // Corpo da tabela.
          {dailyReport.detailed.map((d, idx) => ( // Mapeia itens detalhados.
            <tr key={idx}> // Linha para cada item, com key.
              <td>{d.number}</td> // Célula com número.
              <td>{d.type}</td> // Célula com tipo.
              <td>{d.issueTime}</td> // Célula com tempo de emissão.
              <td>{d.attendanceTime}</td> // Célula com tempo de atendimento.
              <td>{d.guiche}</td> // Célula com guichê.
            </tr> // Fecha tr.
          ))} // Fecha map.
        </tbody> // Fecha tbody.
      </table> // Fecha table.

      <h2>Relatório Mensal</h2> // Subtítulo para relatório mensal.
      <button onClick={() => setShowMonthlyReport(!showMonthlyReport)}> // Botão para alternar visibilidade do relatório mensal.
        {showMonthlyReport ? 'Esconder Relatório Mensal' : 'Mostrar Relatório Mensal'} // Texto do botão condicional.
      </button> // Fecha button.
      {showMonthlyReport && monthlyReport && ( // Renderiza condicionalmente se showMonthlyReport true e monthlyReport existe.
        <div> // Div para conteúdo mensal.
          <p>Quantitativo Geral Emitidas: {monthlyReport.totalIssued}</p> // Total emitidas mensal.
          <p>Quantitativo Geral Atendidas: {monthlyReport.totalAttended}</p> // Total atendidas mensal.
          <p>Quantitativo Emitidas por Prioridade: SP: {monthlyReport.byTypeIssued.SP}, SG: {monthlyReport.byTypeIssued.SG}, SE: {monthlyReport.byTypeIssued.SE}</p> // Emitidas por tipo mensal.
          <p>Quantitativo Atendidas por Prioridade: SP: {monthlyReport.byTypeAttended.SP}, SG: {monthlyReport.byTypeAttended.SG}, SE: {monthlyReport.byTypeAttended.SE}</p> // Atendidas por tipo mensal.
          <p>TM Médio (min): SP: {monthlyReport.tmByType.SP}, SG: {monthlyReport.tmByType.SG}, SE: {monthlyReport.tmByType.SE}</p> // TM médio por tipo mensal.
          <h3>Relatório Detalhado</h3> // Subtítulo para detalhado mensal.
          <table> // Tabela para detalhado mensal.
            <thead> // Cabeçalho.
              <tr> // Linha de cabeçalho.
                <th>Numeração</th> // Coluna Numeração.
                <th>Tipo</th> // Coluna Tipo.
                <th>Data/Hora Emissão</th> // Coluna Data/Hora Emissão.
                <th>Data/Hora Atendimento</th> // Coluna Data/Hora Atendimento.
                <th>Guichê</th> // Coluna Guichê.
              </tr> // Fecha tr.
            </thead> // Fecha thead.
            <tbody> // Corpo.
              {monthlyReport.detailed.map((d, idx) => ( // Mapeia itens detalhados mensais.
                <tr key={idx}> // Linha com key.
                  <td>{d.number}</td> // Número.
                  <td>{d.type}</td> // Tipo.
                  <td>{d.issueTime}</td> // Emissão.
                  <td>{d.attendanceTime}</td> // Atendimento.
                  <td>{d.guiche}</td> // Guichê.
                </tr> // Fecha tr.
              ))} // Fecha map.
            </tbody> // Fecha tbody.
          </table> // Fecha table.
        </div> // Fecha div mensal.
      )} // Fecha o condicional.
    </div> // Fecha div App.
  ); // Fecha o return do JSX.
} // Fecha o componente App.

export default App; // Exporta o componente App como default.
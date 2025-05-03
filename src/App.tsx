import { useState, useEffect, useRef } from 'react';
import './App.css';

// Tipos para a unidade de tempo
type TimeUnit = 'days' | 'months' | 'years';

// Função para formatar valores monetários no formato brasileiro
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Função para remover formatação de moeda e retornar apenas o número
const unformatCurrency = (formattedValue: string): number => {
  return Number(formattedValue.replace(/[^\d,-]/g, '').replace(',', '.'));
};

function App() {
  const [principal, setPrincipal] = useState<number>(100000);
  const [principalFormatted, setPrincipalFormatted] = useState<string>('');
  const [rate, setRate] = useState<number>(8);
  const [monthlyRate, setMonthlyRate] = useState<number>(rate / 12);
  const [time, setTime] = useState<number>(12);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('months');
  const [compoundFrequency, setCompoundFrequency] = useState<number>(365);
  const [result, setResult] = useState<number | null>(null);
  const [netResult, setNetResult] = useState<number | null>(null);
  const [taxRate, setTaxRate] = useState<number>(15);
  const [equivalentRate, setEquivalentRate] = useState<number | null>(null);
  const [equivalentMonthlyRate, setEquivalentMonthlyRate] = useState<number | null>(null);
  const [isEditingPrincipal, setIsEditingPrincipal] = useState<boolean>(false);
  const principalInputRef = useRef<HTMLInputElement>(null);
  const [comparisonEnabled, setComparisonEnabled] = useState<boolean>(true);
  const [valueChanged, setValueChanged] = useState<boolean>(false);

  // Atualiza o valor formatado quando o principal muda
  useEffect(() => {
    if (!isEditingPrincipal) {
      setPrincipalFormatted(formatCurrency(principal));
    }
    // Não recalcular resultados aqui
  }, [principal, isEditingPrincipal]);

  // Atualiza a taxa mensal quando a taxa anual muda, mas sem recalcular resultados
  useEffect(() => {
    setMonthlyRate(rate / 12);
    // Não recalcular resultados aqui
  }, [rate]);

  // Atualiza a taxa anual quando a taxa mensal muda, mas sem recalcular resultados
  const handleMonthlyRateChange = (value: number) => {
    setMonthlyRate(value);
    setRate(value * 12);
    // Não recalcular resultados aqui
  };

  // Função utilitária para remover zeros à esquerda durante a digitação
  const removeLeadingZeros = (value: string) => {
    // Caso especial para "0" ou "0."
    if (value === '0' || value === '0.') return value;
    
    // Para números decimais, preserva um único zero antes do ponto decimal
    if (value.includes('.')) {
      const parts = value.split('.');
      // Remove zeros à esquerda da parte inteira, mas mantém pelo menos um dígito
      const integerPart = parts[0].replace(/^0+/, '') || '0';
      return `${integerPart}.${parts[1]}`;
    }
    
    // Para números inteiros, remove todos os zeros à esquerda
    return value.replace(/^0+/, '') || '0';
  };

  // Manipula mudanças no input de valor principal
  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Marcar que os valores foram alterados
    setValueChanged(true);
    
    // Se estiver vazio, definir para 0
    if (value === '') {
      setPrincipal(0);
      setPrincipalFormatted('');
      return;
    }
    
    // Remove caracteres não numéricos
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (numericValue) {
      // Remove zeros à esquerda e converte para número
      const cleanValue = removeLeadingZeros(numericValue);
      const parsedValue = Number.parseInt(cleanValue, 10);
      setPrincipal(parsedValue);
      
      // Atualiza o valor formatado sem zeros à esquerda
      if (isEditingPrincipal) {
        if (principalInputRef.current) {
          principalInputRef.current.value = cleanValue;
        }
      } else {
        setPrincipalFormatted(value);
      }
    }
  };

  // Manipula o foco no input de valor principal
  const handlePrincipalFocus = () => {
    setIsEditingPrincipal(true);
    if (principalInputRef.current) {
      // Garante que não haja zeros à esquerda ao editar
      principalInputRef.current.value = principal.toString().replace(/^0+/, '') || '0';
    }
  };

  // Manipula a perda de foco no input de valor principal
  const handlePrincipalBlur = () => {
    setIsEditingPrincipal(false);
    setPrincipalFormatted(formatCurrency(principal));
  };

  // Função utilitária para validar entrada numérica
  const handleNumericInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir backspace, delete, tab, escape, enter, setas, ponto e vírgula
    if ([
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      '.', ',', '-'
    ].indexOf(event.key) !== -1 ||
    // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    (
      ['a', 'c', 'v', 'x'].indexOf(event.key.toLowerCase()) !== -1 && 
      (event.ctrlKey || event.metaKey)
    )
    ) {
      return;
    }
    
    // Permitir apenas dígitos
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  };

  // Converte o tempo para anos com base na unidade selecionada
  const convertToYears = (value: number, unit: TimeUnit): number => {
    switch (unit) {
      case 'days':
        return value / 365;
      case 'months':
        return value / 12;
      default:
        return value; // Para 'years'
    }
  };

  // Calcula a alíquota de imposto com base no período
  const calculateTaxRate = (timeInYears: number) => {
    const daysInvestment = timeInYears * 365;
    
    if (daysInvestment <= 180) return 22.5;
    if (daysInvestment <= 360) return 20;
    if (daysInvestment <= 720) return 17.5;
    return 15;
  };

  // Formata valores de taxa de juros com precisão adequada
  const formatRate = (rate: number): string => {
    // Para taxas pequenas, mostra mais casas decimais
    if (rate < 0.1) return rate.toFixed(4);
    if (rate < 1) return rate.toFixed(3);
    if (rate < 10) return rate.toFixed(2);
    return rate.toFixed(1);
  };

  const calculateCompoundInterest = () => {
    // Resetar o indicador de mudança
    setValueChanged(false);
    
    // A = P(1 + r/n)^(nt)
    // A: final amount
    // P: principal
    // r: annual interest rate (in decimal)
    // n: number of times compounded per year
    // t: time in years
    
    const r = rate / 100; // convert percentage to decimal
    const n = compoundFrequency;
    const t = convertToYears(time, timeUnit);
    const P = principal;
    
    const A = P * ((1 + r/n) ** (n * t));
    
    // Calcula a alíquota de imposto
    const currentTaxRate = calculateTaxRate(t);
    setTaxRate(currentTaxRate);
    
    // Calcula o valor bruto e líquido
    const grossProfit = A - P;
    const tax = grossProfit * (currentTaxRate / 100);
    const netProfit = grossProfit - tax;
    const netAmount = P + netProfit;
    
    // Calcula a taxa equivalente sem imposto
    // Para um investimento isento, a taxa que gera o mesmo resultado líquido
    // pode ser calculada invertendo a fórmula de juros compostos
    // Fórmula: r = n * ((netAmount/P)^(1/(n*t)) - 1)
    const equivalentTaxRate = n * ((netAmount/P)**(1/(n*t)) - 1) * 100;
    const equivalentMonthlyTaxRate = equivalentTaxRate / 12;
    
    setResult(A);
    setNetResult(netAmount);
    setEquivalentRate(equivalentTaxRate);
    setEquivalentMonthlyRate(equivalentMonthlyTaxRate);
  };

  return (
    <div className="App">
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg calculator-card">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 calculator-title">Calculadora de Juros Compostos</h1>
        
        <div className="form-group mb-4">
          <label htmlFor="principal" className="block text-gray-700 text-sm font-bold mb-2">
            Valor Principal
          </label>
          <input
            id="principal"
            ref={principalInputRef}
            type={isEditingPrincipal ? "number" : "text"}
            inputMode="decimal"
            value={isEditingPrincipal ? principal : principalFormatted}
            onChange={handlePrincipalChange}
            onFocus={handlePrincipalFocus}
            onBlur={handlePrincipalBlur}
            onKeyDown={handleNumericInput}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="rate" className="block text-gray-700 text-sm font-bold mb-2">
              Taxa de Juros Anual (%)
            </label>
            <input
              id="rate"
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setRate(0);
                  return;
                }
                
                // Remove zeros à esquerda mantendo estrutura decimal
                const cleanValue = removeLeadingZeros(value);
                
                // Atualiza o campo com o valor limpo
                e.target.value = cleanValue;
                
                // Converte para número
                const numericValue = Number.parseFloat(cleanValue);
                if (!Number.isNaN(numericValue)) {
                  setRate(numericValue);
                  setValueChanged(true);
                }
              }}
              onKeyDown={handleNumericInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
            />
          </div>
          
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="monthlyRate" className="block text-gray-700 text-sm font-bold mb-2">
              Taxa de Juros Mensal (%)
            </label>
            <input
              id="monthlyRate"
              type="number"
              inputMode="decimal"
              value={monthlyRate.toFixed(4)}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  handleMonthlyRateChange(0);
                  return;
                }
                
                // Remove zeros à esquerda mantendo estrutura decimal
                const cleanValue = removeLeadingZeros(value);
                
                // Atualiza o campo com o valor limpo
                e.target.value = cleanValue;
                
                // Converte para número 
                const numericValue = Number.parseFloat(cleanValue);
                if (!Number.isNaN(numericValue)) {
                  handleMonthlyRateChange(numericValue);
                  setValueChanged(true);
                }
              }}
              onKeyDown={handleNumericInput}
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="time" className="block text-gray-700 text-sm font-bold mb-2">
              Tempo
            </label>
            <input
              id="time"
              type="number"
              inputMode="numeric"
              value={time}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setTime(0);
                  return;
                }
                
                // Remove zeros à esquerda
                const cleanValue = removeLeadingZeros(value);
                
                // Atualiza o campo com o valor limpo
                e.target.value = cleanValue;
                
                // Converte para número inteiro
                const numericValue = Number.parseInt(cleanValue, 10);
                if (!Number.isNaN(numericValue)) {
                  setTime(numericValue);
                  setValueChanged(true);
                }
              }}
              onKeyDown={handleNumericInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
            />
          </div>
          
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="timeUnit" className="block text-gray-700 text-sm font-bold mb-2">
              Unidade de Tempo
            </label>
            <select
              id="timeUnit"
              value={timeUnit}
              onChange={(e) => {
                setTimeUnit(e.target.value as TimeUnit);
                setValueChanged(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
            >
              <option value="days">Dias</option>
              <option value="months">Meses</option>
              <option value="years">Anos</option>
            </select>
          </div>
        </div>
        
        <div className="form-group mb-4">
          <label htmlFor="compoundFrequency" className="block text-gray-700 text-sm font-bold mb-2">
            Frequência de Capitalização
          </label>
          <select
            id="compoundFrequency"
            value={compoundFrequency}
            onChange={(e) => {
              setCompoundFrequency(Number(e.target.value));
              setValueChanged(true);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
          >
            <option value={1}>Anual</option>
            <option value={2}>Semestral</option>
            <option value={4}>Trimestral</option>
            <option value={12}>Mensal</option>
            <option value={365}>Diária</option>
          </select>
        </div>
        
        <button
          type="button"
          onClick={calculateCompoundInterest}
          className={`w-full ${valueChanged ? 'bg-orange-500 animate-pulse' : 'bg-orange-500'} hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500`}
        >
          {valueChanged && result !== null ? 'Recalcular' : 'Calcular'}
        </button>
        
        {valueChanged && result !== null && (
          <div className="mt-2 text-center text-xs text-orange-600 animate-pulse">
            ⚠️ Os valores foram alterados. Clique em "Recalcular" para atualizar os resultados.
          </div>
        )}
        
        {result !== null && (
          <div className={`mt-4 sm:mt-6 p-4 bg-gray-100 rounded-md result-container ${valueChanged ? 'opacity-70' : ''} relative`}>
            {valueChanged && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700 bg-opacity-30 rounded-md z-10">
                <div className="bg-white p-3 rounded-md shadow-md text-center">
                  <p className="text-orange-600 font-bold mb-2">Valores desatualizados</p>
                  <button 
                    type="button"
                    onClick={calculateCompoundInterest}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Recalcular agora
                  </button>
                </div>
              </div>
            )}
            <h2 className="text-lg font-bold mb-2 result-title">Resultado:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm result-title">
                  <span className="font-bold">Montante Final (Bruto):</span>
                </p>
                <p className="text-lg sm:text-xl mb-1 result-value">{formatCurrency(result)}</p>
              </div>
              <div>
                <p className="text-sm result-title">
                  <span className="font-bold">Juros Ganhos (Bruto):</span>
                </p>
                <p className="text-lg sm:text-xl mb-1 result-value">{formatCurrency(result - principal)}</p>
              </div>
            </div>
            
            <hr className="my-3 border-gray-300" />
            
            <div className="bg-blue-50 p-3 rounded-md mb-3 tax-info">
              <p className="text-sm mb-1">
                <span className="font-semibold">Alíquota de Imposto:</span> {taxRate}%
              </p>
              <p className="text-xs text-gray-600">
                Período: {(convertToYears(time, timeUnit) * 365).toFixed(0)} dias
              </p>
              {equivalentRate !== null && (
                <div className="mt-3 border-t border-orange-200 pt-3">
                  <p className="text-sm font-semibold mb-1">
                    Taxa Equivalente Sem Imposto: <span className="text-orange-600">{formatRate(equivalentRate)}% a.a.</span>
                    {equivalentMonthlyRate !== null && (
                      <span className="ml-1 text-orange-500">({formatRate(equivalentMonthlyRate)}% a.m.)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    Esta é a taxa bruta que um investimento isento de IR precisaria ter para igualar o rendimento líquido desta aplicação.
                  </p>
                  
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="showComparison"
                      checked={comparisonEnabled}
                      onChange={(e) => setComparisonEnabled(e.target.checked)}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-gray-300 rounded"
                    />
                    <label htmlFor="showComparison" className="ml-2 text-xs text-gray-700">
                      Mostrar comparativo detalhado
                    </label>
                  </div>
                  
                  {comparisonEnabled && equivalentRate !== null && result !== null && netResult !== null && (
                    <div className="mt-3 pt-2">
                      <p className="text-xs font-semibold mb-2">Comparativo para {formatCurrency(principal)} em {time} {timeUnit === 'days' ? 'dias' : timeUnit === 'months' ? 'meses' : 'anos'}:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-orange-50 p-2 rounded">
                          <p className="font-semibold text-orange-700">Investimento com IR ({rate}%):</p>
                          <p>Rendimento Bruto: {formatCurrency(result - principal)}</p>
                          <p>IR ({taxRate}%): {formatCurrency((result - principal) * (taxRate / 100))}</p>
                          <p className="font-bold">Rendimento Líquido: {formatCurrency(netResult - principal)}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="font-semibold text-gray-700">Investimento Isento ({formatRate(equivalentRate)}%):</p>
                          <p>Rendimento: {formatCurrency(principal * ((1 + equivalentRate/100/compoundFrequency) ** (compoundFrequency * convertToYears(time, timeUnit))) - principal)}</p>
                          <p>IR: {formatCurrency(0)}</p>
                          <p className="font-bold">Rendimento Líquido: {formatCurrency(netResult - principal)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm result-title">
                  <span className="font-bold">Montante Final (Líquido):</span>
                </p>
                <p className="text-lg sm:text-xl text-orange-600 mb-1">
                  {netResult ? formatCurrency(netResult) : 'R$ 0,00'}
                </p>
              </div>
              <div>
                <p className="text-sm result-title">
                  <span className="font-bold">Juros Ganhos (Líquido):</span>
                </p>
                <p className="text-lg sm:text-xl text-orange-600 mb-1">
                  {netResult ? formatCurrency(netResult - principal) : 'R$ 0,00'}
                </p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Imposto de renda sobre o rendimento: {formatCurrency((result - principal) * (taxRate / 100))}
            </p>
          </div>
        )}
        <footer className="w-full text-center text-xs text-gray-500 mt-6">
          <p className="font-medium">
            &copy; {new Date().getFullYear()} - Calculadora de Juros Compostos
          </p>
          <p className="text-orange-600 font-semibold">
            Desenvolvido por <a href="https://www.linkedin.com/in/pierresantana/" target="_blank" rel="noopener noreferrer">Pierre Santana</a>
          </p>
          <p className="text-gray-400 text-[10px] mt-1">
            Versão 1.0.0 | Todos os direitos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

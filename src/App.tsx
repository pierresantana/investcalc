import { useState, useEffect } from 'react';
import CurrencyInput from 'react-currency-input-field';
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

const compoundFrequency = 1;

function App() {
  const [principal, setPrincipal] = useState<string>('100000,00');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('0,00');
  const [rate, setRate] = useState<string>('8');
  const [monthlyRate, setMonthlyRate] = useState<string>(() => {
    const annualRate = 8; // Initial annual rate
    const initialMonthlyRate = ((1 + annualRate / 100) ** (1/12) - 1) * 100;
    return initialMonthlyRate.toFixed(4).replace('.', ',');
  });
  const [time, setTime] = useState<number>(12);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('months');
  const [result, setResult] = useState<number | null>(null);
  const [netResult, setNetResult] = useState<number | null>(null);
  const [taxRate, setTaxRate] = useState<number>(15);
  const [equivalentRate, setEquivalentRate] = useState<number | null>(null);
  const [equivalentMonthlyRate, setEquivalentMonthlyRate] = useState<number | null>(null);
  const [comparisonEnabled, setComparisonEnabled] = useState<boolean>(true);
  const [valueChanged, setValueChanged] = useState<boolean>(false);

  // Atualiza a taxa mensal quando a taxa anual muda
  useEffect(() => {
    // Calculando a taxa mensal a partir da taxa anual usando juros compostos
    // Formula: (1 + taxa_anual/100)^(1/12) - 1
    try {
      const annualRateStr = rate.replace(',', '.');
      const annualRate = Number.parseFloat(annualRateStr);
      
      if (annualRateStr === '' || Number.isNaN(annualRate)) {
        setMonthlyRate('0,0000');
        return;
      }
      
      const calculatedMonthlyRate = ((1 + annualRate / 100) ** (1/12) - 1) * 100;
      setMonthlyRate(calculatedMonthlyRate.toFixed(4).replace('.', ','));
    } catch (error) {
      setMonthlyRate('0,0000');
    }
  }, [rate]);

  // Atualiza a taxa anual quando a taxa mensal muda
  const handleMonthlyRateChange = (value: string | undefined) => {
    try {
      if (!value) {
        setMonthlyRate('0,0000');
        setRate('0');
        setValueChanged(true);
        return;
      }
      
      const monthlyRateValue = Number.parseFloat(value.replace(',', '.'));
      
      if (Number.isNaN(monthlyRateValue)) {
        setMonthlyRate('0,0000');
        setRate('0');
        setValueChanged(true);
        return;
      }
      
      setMonthlyRate(monthlyRateValue.toFixed(4).replace('.', ','));
      
      // Calculando a taxa anual a partir da taxa mensal usando juros compostos
      // Formula: (1 + taxa_mensal/100)^12 - 1
      const calculatedAnnualRate = ((1 + monthlyRateValue / 100) ** 12 - 1) * 100;
      setRate(calculatedAnnualRate.toFixed(2).replace('.', ','));
      setValueChanged(true);
    } catch (error) {
      setMonthlyRate('0,0000');
      setRate('0');
      setValueChanged(true);
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
    
    const r = Number.parseFloat(rate.replace(',', '.')) / 100; // convert percentage to decimal
    const n = compoundFrequency;
    const t = convertToYears(time, timeUnit);
    const P = Number.parseFloat(principal.replace(',', '.'));
    const M = Number.parseFloat(monthlyContribution.replace(',', '.'));
    
    let A: number;
    
    if (M > 0) {
      // Quando há aportes mensais, usamos uma fórmula diferente
      // Para aportes mensais, consideramos que o aporte é feito no início de cada mês
      
      // Calculamos o número total de meses
      const totalMonths = Math.ceil(t * 12);
      
      // Começamos com o principal
      let currentBalance = P;
      
      // Taxa mensal efetiva (considerando a capitalização)
      const effectiveMonthlyRate = ((1 + r/n) ** (n/12)) - 1;
      
      // Para cada mês, adicionamos o aporte e calculamos os juros
      for (let month = 0; month < totalMonths; month++) {
        // Adiciona o aporte mensal (exceto no primeiro mês, pois já temos o principal)
        if (month > 0) {
          currentBalance += M;
        }
        
        // Aplica os juros mensais
        currentBalance *= (1 + effectiveMonthlyRate);
      }
      
      A = currentBalance;
    } else {
      // Fórmula padrão de juros compostos sem aportes mensais
      // A = P(1 + r/n)^(nt)
      // A: final amount
      // P: principal
      // r: annual interest rate (in decimal)
      // n: number of times compounded per year
      // t: time in years
      A = P * ((1 + r/n) ** (n * t));
    }
    
    // Calcula a alíquota de imposto
    const currentTaxRate = calculateTaxRate(t);
    setTaxRate(currentTaxRate);
    
    // Total investido (principal + total de aportes mensais)
    let totalInvested: number;
    
    if (M > 0) {
      // Total de meses excluindo o mês inicial (que é o principal)
      const contributionMonths = Math.ceil(t * 12) - 1;
      totalInvested = P + (M * Math.max(0, contributionMonths));
    } else {
      totalInvested = P;
    }
    
    // Calcula o valor bruto e líquido
    const grossProfit = A - totalInvested;
    const tax = grossProfit * (currentTaxRate / 100);
    const netProfit = grossProfit - tax;
    const netAmount = totalInvested + netProfit;
    
    // Calcula a taxa equivalente sem imposto
    // Para um investimento isento, a taxa que gera o mesmo resultado líquido
    // pode ser calculada invertendo a fórmula de juros compostos
    // Fórmula: r = n * ((netAmount/P)^(1/(n*t)) - 1)
    
    // Quando há aportes mensais, esta é uma aproximação
    const equivalentTaxRate = n * ((netAmount/totalInvested)**(1/(n*t)) - 1) * 100;
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
          <CurrencyInput
            id="principal"
            name="principal"
            placeholder="0,00"
            decimalsLimit={2}
            decimalSeparator=","
            groupSeparator="."
            prefix="R$ "
            defaultValue={principal}
            value={principal}
            onValueChange={(value) => {
              if (value) {
                setPrincipal(value);
                setValueChanged(true);
              } else {
                setPrincipal('0,00');
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
          />
        </div>
        
        <div className="form-group mb-4">
          <label htmlFor="monthlyContribution" className="block text-gray-700 text-sm font-bold mb-2">
            Aporte Mensal
          </label>
          <CurrencyInput
            id="monthlyContribution"
            name="monthlyContribution"
            placeholder="0,00"
            decimalsLimit={4}
            decimalSeparator=","
            groupSeparator="."
            prefix="R$ "
            defaultValue={monthlyContribution}
            value={monthlyContribution}
            onValueChange={(value) => {
              if (value) {
                setMonthlyContribution(value);
                setValueChanged(true);
              } else {
                setMonthlyContribution('0,00');
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="rate" className="block text-gray-700 text-sm font-bold mb-2">
              Taxa de Juros Anual (%)
            </label>
            <CurrencyInput
              id="rate"
              name="rate"
              placeholder="0,00"
              decimalsLimit={4}
              decimalSeparator=","
              groupSeparator="."
              suffix="%"
              defaultValue={rate}
              value={rate}
              onValueChange={(value) => {
                try {
                  if (value) {
                    // Verify if it's a valid number
                    const testValue = Number.parseFloat(value.replace(',', '.'));
                    if (!Number.isNaN(testValue)) {
                      setRate(value);
                    } else {
                      setRate('0');
                    }
                  } else {
                    setRate('0');
                  }
                  setValueChanged(true);
                } catch (error) {
                  setRate('0');
                  setValueChanged(true);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
            />
          </div>
          
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="monthlyRate" className="block text-gray-700 text-sm font-bold mb-2">
              Taxa de Juros Mensal (%)
            </label>
            <CurrencyInput
              id="monthlyRate"
              name="monthlyRate"
              placeholder="0,0000"
              decimalsLimit={6}
              decimalSeparator=","
              groupSeparator="."
              suffix="%"
              defaultValue={monthlyRate}
              value={monthlyRate}
              onValueChange={(value) => handleMonthlyRateChange(value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 input-field"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="form-group mb-2 sm:mb-4 w-full sm:flex-1">
            <label htmlFor="time" className="block text-gray-700 text-sm font-bold mb-2">
              Tempo
            </label>
            <CurrencyInput
              id="time"
              name="time"
              placeholder="0"
              decimalsLimit={0}
              disableGroupSeparators={true}
              defaultValue={time}
              value={time}
              onValueChange={(value) => {
                if (value) {
                  setTime(Number(value));
                  setValueChanged(true);
                } else {
                  setTime(0);
                }
              }}
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
                {Number.parseFloat(monthlyContribution.replace(',', '.')) > 0 ? (
                  <>
                    <p className="text-lg sm:text-xl mb-1 result-value">
                      {formatCurrency(result - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1))))}
                    </p>
                    <p className="text-xs text-gray-600">
                      Total investido: {formatCurrency(Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1)))}
                    </p>
                  </>
                ) : (
                  <p className="text-lg sm:text-xl mb-1 result-value">{formatCurrency(result - Number.parseFloat(principal.replace(',', '.')))}</p>
                )}
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
                      {Number.parseFloat(monthlyContribution.replace(',', '.')) > 0 ? (
                        <p className="text-xs font-semibold mb-2">
                          Comparativo para {formatCurrency(Number.parseFloat(principal.replace(',', '.')))} inicial + {formatCurrency(Number.parseFloat(monthlyContribution.replace(',', '.')))} mensais em {time} {timeUnit === 'days' ? 'dias' : timeUnit === 'months' ? 'meses' : 'anos'}:
                        </p>
                      ) : (
                        <p className="text-xs font-semibold mb-2">
                          Comparativo para {formatCurrency(Number.parseFloat(principal.replace(',', '.')))} em {time} {timeUnit === 'days' ? 'dias' : timeUnit === 'months' ? 'meses' : 'anos'}:
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-orange-50 p-2 rounded">
                          <p className="font-semibold text-orange-700">Investimento com IR ({rate}%):</p>
                          {Number.parseFloat(monthlyContribution.replace(',', '.')) > 0 ? (
                            <>
                              <p>Total Investido: {formatCurrency(Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1)))}</p>
                              <p>Rendimento Bruto: {formatCurrency(result - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1))))}</p>
                              <p>IR ({taxRate}%): {formatCurrency((result - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1)))) * (taxRate / 100))}</p>
                              <p className="font-bold">Rendimento Líquido: {formatCurrency(netResult - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1))))}</p>
                            </>
                          ) : (
                            <>
                              <p>Rendimento Bruto: {formatCurrency(result - Number.parseFloat(principal.replace(',', '.')))}</p>
                              <p>IR ({taxRate}%): {formatCurrency((result - Number.parseFloat(principal.replace(',', '.'))) * (taxRate / 100))}</p>
                              <p className="font-bold">Rendimento Líquido: {formatCurrency(netResult - Number.parseFloat(principal.replace(',', '.')))}</p>
                            </>
                          )}
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="font-semibold text-gray-700">Investimento Isento ({formatRate(equivalentRate)}%):</p>
                          {Number.parseFloat(monthlyContribution.replace(',', '.')) > 0 ? (
                            <>
                              <p>Total Investido: {formatCurrency(Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1)))}</p>
                              <p>Rendimento: {formatCurrency(netResult - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1))))}</p>
                              <p>IR: {formatCurrency(0)}</p>
                              <p className="font-bold">Rendimento Líquido: {formatCurrency(netResult - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1))))}</p>
                            </>
                          ) : (
                            <>
                              <p>Rendimento: {formatCurrency(Number.parseFloat(principal.replace(',', '.')) * ((1 + equivalentRate/100) ** (convertToYears(time, timeUnit))) - Number.parseFloat(principal.replace(',', '.')))}</p>
                              <p>IR: {formatCurrency(0)}</p>
                              <p className="font-bold">Rendimento Líquido: {formatCurrency(netResult - Number.parseFloat(principal.replace(',', '.')))}</p>
                            </>
                          )}
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
                {Number.parseFloat(monthlyContribution.replace(',', '.')) > 0 ? (
                  <>
                    <p className="text-lg sm:text-xl text-orange-600 mb-1">
                      {netResult ? formatCurrency(netResult - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1)))) : 'R$ 0,00'}
                    </p>
                  </>
                ) : (
                  <p className="text-lg sm:text-xl text-orange-600 mb-1">
                    {netResult ? formatCurrency(netResult - Number.parseFloat(principal.replace(',', '.'))) : 'R$ 0,00'}
                  </p>
                )}
              </div>
            </div>
            
            {Number.parseFloat(monthlyContribution.replace(',', '.')) > 0 ? (
              <p className="text-xs text-gray-500 mt-3">
                Imposto de renda sobre o rendimento: {formatCurrency((result - (Number.parseFloat(principal.replace(',', '.')) + (Number.parseFloat(monthlyContribution.replace(',', '.')) * (Math.ceil(convertToYears(time, timeUnit) * 12) - 1)))) * (taxRate / 100))}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-3">
                Imposto de renda sobre o rendimento: {formatCurrency((result - Number.parseFloat(principal.replace(',', '.')) ) * (taxRate / 100))}
              </p>
            )}
          </div>
        )}
        <footer className="w-full text-center text-xs text-gray-500 mt-6">
          <p className="font-medium">
            &copy; {new Date().getFullYear()}, Built with ❤️ by <a href="https://www.pierresantana.com" target="_blank" rel="noopener noreferrer">Pierre Santana</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

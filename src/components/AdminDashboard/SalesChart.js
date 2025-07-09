import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const SalesChart = ({ salesData, type }) => {
  const chartRawData = type === 'daily' ? salesData.byDate : salesData.byMonth;

  if (!chartRawData || chartRawData.length === 0) {
    return <p className="no-data-message">표시할 매출 데이터가 없습니다.</p>;
  }

  const labels = chartRawData.map(item => type === 'daily' ? item.date : item.month);
  const bands = ['현장', '단잠', '대실', 'OTA', '야놀자', '여기어때'];
  const colors = ['#1a237e', '#4caf50', '#f44336', '#ff9800', '#3f51b5', '#e91e63'];

  const datasets = bands.map((band, index) => ({
    label: band,
    data: chartRawData.map(item => item.bands[band] || 0),
    backgroundColor: colors[index],
    stack: type === 'monthly' ? 'Stack 0' : undefined,
  }));

  const totalRevenues = chartRawData.map(item =>
    Object.values(item.bands).reduce((sum, value) => sum + (value || 0), 0)
  );

  const chartData = { labels, datasets };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: '밴드별 매출 추이' },
      datalabels: {
        display: type === 'monthly',
        color: '#333',
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          if (context.datasetIndex === context.chart.data.datasets.length - 1) {
            return totalRevenues[context.dataIndex]?.toLocaleString() + '원';
          }
          return '';
        },
        font: { weight: 'bold' },
      },
    },
    scales: {
      x: { stacked: type === 'monthly' },
      y: { stacked: type === 'monthly', beginAtZero: true },
    },
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default SalesChart;
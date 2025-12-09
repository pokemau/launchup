<script lang="ts">
  import Chart from 'chart.js/auto';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';

  let {
    min,
    max,
    labels,
    data,
    id
  }: { min: number; max: number; labels: any; data: any; id: number } =
    $props();

  let chart: Chart | null = null;
  let ctx: HTMLCanvasElement;

  const createChart = () => {
    if (!browser) return;

    ctx = document.getElementById(`chart${id}`) as HTMLCanvasElement;
    if (!ctx) return;

    if (chart) {
      chart.destroy();
    }

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Readiness Level',
          data,
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(54, 162, 235)'
        }
      ]
    };

    chart = new Chart(ctx, {
      type: 'radar',
      data: chartData,
      options: {
        scales: {
          r: {
            min,
            max,
            ticks: {
              stepSize: 1
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  };

  onMount(() => {
    createChart();
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  $effect(() => {
    if (browser && data && labels) {
      createChart();
    }
  });
</script>

<canvas id={`chart${id}`} height="600" width="600"></canvas>

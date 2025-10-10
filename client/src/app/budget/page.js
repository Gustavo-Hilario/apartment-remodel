/**
 * Budget Overview Page
 *
 * View budget summary and progress with charts
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, LoadingSpinner, Button } from '@/components/ui';
import { totalsAPI, categoriesAPI, roomsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import Chart from 'chart.js/auto';

export default function BudgetPage() {
    const [totals, setTotals] = useState(null);
    const [categories, setCategories] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('overview'); // 'overview' or 'room'
    const [selectedRoom, setSelectedRoom] = useState('');
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Cleanup chart on unmount
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [totalsData, categoriesData, roomsData] = await Promise.all([
                totalsAPI.get(),
                categoriesAPI.getAll(),
                roomsAPI.getAll(),
            ]);
            setTotals(totalsData);
            // Ensure categories is always an array
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            setRooms(Array.isArray(roomsData) ? roomsData : []);
            if (roomsData && roomsData.length > 0) {
                setSelectedRoom(roomsData[0].name);
            }
        } catch (err) {
            console.error(err);
            setCategories([]); // Set empty array on error
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    const updateChart = useCallback(() => {
        if (!chartRef.current || rooms.length === 0) return;

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');

        let labels, budgetData, expectedData, actualData;

        if (view === 'overview') {
            // Show all rooms
            labels = rooms.map((room) => room.name);
            budgetData = rooms.map((room) => room.budget || 0);
            
            // Expected: sum of all item subtotals
            expectedData = rooms.map((room) => {
                const items = room.items || [];
                return items.reduce((sum, item) => {
                    const qty = parseFloat(item.quantity) || 0;
                    const actualPrice = parseFloat(item.actual_price || item.actualRate) || 0;
                    const budgetPrice = parseFloat(item.budget_price || item.budgetRate) || 0;
                    // Use actual_price if set and non-zero, otherwise budget_price
                    const price = actualPrice > 0 ? actualPrice : budgetPrice;
                    return sum + qty * price;
                }, 0);
            });
            
            // Actual: only COMPLETED items
            actualData = rooms.map((room) => {
                const items = room.items || [];
                return items
                    .filter((item) => item.status === 'Completed')
                    .reduce((sum, item) => {
                        const qty = parseFloat(item.quantity) || 0;
                        const actualPrice =
                            parseFloat(item.actual_price || item.actualRate) ||
                            0;
                        const budgetPrice =
                            parseFloat(item.budget_price || item.budgetRate) ||
                            0;
                        // Use actual_price if set and non-zero, otherwise budget_price
                        const price =
                            actualPrice > 0 ? actualPrice : budgetPrice;
                        return sum + qty * price;
                    }, 0);
            });
        } else {
            // Show single room - group by category
            const room = rooms.find((r) => r.name === selectedRoom);
            if (!room) return;

            // Group items by category and calculate totals
            const categoryTotals = {};
            (room.items || []).forEach((item) => {
                const category = item.category || 'Other';
                const qty = parseFloat(item.quantity) || 0;
                const budgetPrice = parseFloat(
                    item.budgetRate || item.budget_price || 0
                );
                const actualPrice = parseFloat(
                    item.actualRate || item.actual_price || 0
                );

                if (!categoryTotals[category]) {
                    categoryTotals[category] = { budget: 0, expected: 0, actual: 0 };
                }

                categoryTotals[category].budget += qty * budgetPrice;
                // Expected: use actual_price if set, otherwise budget_price
                const expectedPrice = actualPrice > 0 ? actualPrice : budgetPrice;
                categoryTotals[category].expected += qty * expectedPrice;
                // Actual: only count if item is completed
                if (item.status === 'Completed') {
                    categoryTotals[category].actual += qty * (actualPrice > 0 ? actualPrice : budgetPrice);
                }
            });

            labels = Object.keys(categoryTotals);
            budgetData = labels.map((cat) => categoryTotals[cat].budget);
            expectedData = labels.map((cat) => categoryTotals[cat].expected);
            actualData = labels.map((cat) => categoryTotals[cat].actual);
        }

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Budget',
                        data: budgetData,
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Expected',
                        data: expectedData,
                        backgroundColor: 'rgba(118, 75, 162, 0.6)',
                        borderColor: 'rgba(118, 75, 162, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Actual',
                        data: actualData,
                        backgroundColor: 'rgba(238, 9, 121, 0.8)',
                        borderColor: 'rgba(238, 9, 121, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return (
                                    context.dataset.label +
                                    ': ' +
                                    formatCurrency(context.parsed.y)
                                );
                            },
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return formatCurrency(value);
                            },
                        },
                    },
                },
            },
        });
    }, [view, selectedRoom, rooms]);

    useEffect(() => {
        // Update chart when view or selectedRoom changes
        if (rooms.length > 0 && !loading) {
            updateChart();
        }
    }, [view, selectedRoom, rooms, loading, updateChart]);

    if (loading) {
        return (
            <MainLayout>
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <LoadingSpinner
                        size='large'
                        text='Loading budget data...'
                    />
                </div>
            </MainLayout>
        );
    }

    // Calculate total expected across all rooms
    const totalExpected = rooms.reduce((sum, room) => {
        const roomExpected = (room.items || []).reduce((itemSum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const actualPrice = parseFloat(item.actual_price) || 0;
            const budgetPrice = parseFloat(item.budget_price) || 0;
            const price = actualPrice > 0 ? actualPrice : budgetPrice;
            return itemSum + (qty * price);
        }, 0);
        return sum + roomExpected;
    }, 0);

    const remaining = (totals?.totalBudget || 0) - (totals?.totalExpenses || 0);
    const percentUsed =
        totals?.totalBudget > 0
            ? (totals.totalExpenses / totals.totalBudget) * 100
            : 0;

    return (
        <MainLayout>
            <div className='budget-page'>
                <header className='page-header'>
                    <h1>💰 Budget Overview</h1>
                    <Button icon='📊'>Export Report</Button>
                </header>

                {/* Main Budget Card */}
                <Card title='Project Budget Summary'>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '24px',
                            marginBottom: '24px',
                        }}
                    >
                        <div className='budget-stat'>
                            <div className='stat-label'>Total Budget</div>
                            <div
                                className='stat-value'
                                style={{ color: '#667eea' }}
                            >
                                {formatCurrency(totals?.totalBudget || 0)}
                            </div>
                        </div>

                        <div className='budget-stat'>
                            <div className='stat-label'>Expected</div>
                            <div
                                className='stat-value'
                                style={{ color: '#764ba2' }}
                            >
                                {formatCurrency(totalExpected)}
                            </div>
                        </div>

                        <div className='budget-stat'>
                            <div className='stat-label'>Total Spent</div>
                            <div
                                className='stat-value'
                                style={{ color: '#ee0979' }}
                            >
                                {formatCurrency(totals?.totalExpenses || 0)}
                            </div>
                        </div>

                        <div className='budget-stat'>
                            <div className='stat-label'>Remaining</div>
                            <div
                                className='stat-value'
                                style={{
                                    color:
                                        remaining >= 0 ? '#11998e' : '#ee0979',
                                }}
                            >
                                {formatCurrency(remaining)}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className='progress-section'>
                        <div className='progress-header'>
                            <span>Budget Used</span>
                            <span className='progress-percent'>
                                {percentUsed.toFixed(1)}%
                            </span>
                        </div>
                        <div className='progress-bar'>
                            <div
                                className='progress-fill'
                                style={{
                                    width: `${Math.min(percentUsed, 100)}%`,
                                    background:
                                        percentUsed > 100
                                            ? 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'
                                            : percentUsed > 80
                                            ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                            />
                        </div>
                    </div>
                </Card>

                {/* Chart Section */}
                <Card title='Budget vs Expected vs Actual'>
                    <div
                        style={{
                            marginBottom: '20px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <select
                            value={view}
                            onChange={(e) => setView(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '2px solid #667eea',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: 'white',
                                color: '#667eea',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <option value='overview'>
                                📊 Project Overview
                            </option>
                            <option value='room'>🏠 Room Details</option>
                        </select>

                        {view === 'room' && rooms.length > 0 && (
                            <select
                                value={selectedRoom}
                                onChange={(e) =>
                                    setSelectedRoom(e.target.value)
                                }
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: '2px solid #764ba2',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    background: 'white',
                                    color: '#764ba2',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {rooms.map((room) => (
                                    <option key={room.name} value={room.name}>
                                        {room.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div
                        style={{
                            height: '400px',
                            position: 'relative',
                            marginBottom: '30px',
                        }}
                    >
                        <canvas ref={chartRef}></canvas>
                    </div>

                    {/* Room Breakdown Table */}
                    {view === 'overview' && rooms.length > 0 && (
                        <div style={{ marginTop: '30px' }}>
                            <h3
                                style={{
                                    marginBottom: '16px',
                                    fontSize: '1.1rem',
                                    color: '#333',
                                }}
                            >
                                Room Breakdown
                            </h3>
                            <div className='table-wrapper'>
                                <table className='room-breakdown-table'>
                                    <thead>
                                        <tr>
                                            <th>Room</th>
                                            <th>Budget</th>
                                            <th>Expected</th>
                                            <th>Actual</th>
                                            <th>Difference</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map((room) => {
                                            const budget = room.budget || 0;
                                            
                                            // Calculate expected total: sum of all item subtotals
                                            const expected = (room.items || []).reduce((sum, item) => {
                                                const qty = parseFloat(item.quantity) || 0;
                                                const actualPrice = parseFloat(item.actual_price || item.actualRate) || 0;
                                                const budgetPrice = parseFloat(item.budget_price || item.budgetRate) || 0;
                                                // Use actual_price if set and non-zero, otherwise budget_price
                                                const price = actualPrice > 0 ? actualPrice : budgetPrice;
                                                return sum + (qty * price);
                                            }, 0);
                                            
                                            // Calculate actual total: only COMPLETED items
                                            const actual = (room.items || [])
                                                .filter(
                                                    (item) =>
                                                        item.status ===
                                                        'Completed'
                                                )
                                                .reduce((sum, item) => {
                                                    const qty =
                                                        parseFloat(
                                                            item.quantity
                                                        ) || 0;
                                                    const actualPrice =
                                                        parseFloat(
                                                            item.actual_price ||
                                                                item.actualRate
                                                        ) || 0;
                                                    const budgetPrice =
                                                        parseFloat(
                                                            item.budget_price ||
                                                                item.budgetRate
                                                        ) || 0;
                                                    // Use actual_price if set and non-zero, otherwise budget_price
                                                    const price =
                                                        actualPrice > 0
                                                            ? actualPrice
                                                            : budgetPrice;
                                                    return sum + qty * price;
                                                }, 0);
                                            const difference = budget - actual;
                                            const percentUsed =
                                                budget > 0
                                                    ? (actual / budget) * 100
                                                    : 0;

                                            let status = 'Pending';
                                            let statusClass = 'pending';

                                            if (
                                                actual > 0 &&
                                                percentUsed >= 100
                                            ) {
                                                status = 'Completed';
                                                statusClass = 'completed';
                                            } else if (
                                                actual > 0 &&
                                                percentUsed < 100
                                            ) {
                                                status = 'In Progress';
                                                statusClass = 'in-progress';
                                            }

                                            return (
                                                <tr key={room.name}>
                                                    <td>
                                                        <strong>
                                                            {room.name}
                                                        </strong>
                                                    </td>
                                                    <td>
                                                        {formatCurrency(budget)}
                                                    </td>
                                                    <td style={{ color: '#764ba2', fontWeight: '600' }}>
                                                        {formatCurrency(expected)}
                                                    </td>
                                                    <td>
                                                        {actual > 0
                                                            ? formatCurrency(
                                                                  actual
                                                              )
                                                            : 'Not started'}
                                                    </td>
                                                    <td
                                                        className={
                                                            difference >= 0
                                                                ? 'positive'
                                                                : 'negative'
                                                        }
                                                    >
                                                        {formatCurrency(
                                                            difference
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`status-badge status-${statusClass}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Item Breakdown Table for Room View */}
                    {view === 'room' && selectedRoom && rooms.length > 0 && (
                        <div style={{ marginTop: '30px' }}>
                            <h3
                                style={{
                                    marginBottom: '16px',
                                    fontSize: '1.1rem',
                                    color: '#333',
                                }}
                            >
                                All Items - {selectedRoom}
                            </h3>
                            <div className='table-wrapper'>
                                <table className='room-breakdown-table'>
                                    <thead>
                                        <tr>
                                            <th>⭐</th>
                                            <th>Item</th>
                                            <th>Category</th>
                                            <th>Qty</th>
                                            <th>Budget Price</th>
                                            <th>Actual Price</th>
                                            <th>Budget Total</th>
                                            <th>Actual Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const room = rooms.find(
                                                (r) => r.name === selectedRoom
                                            );
                                            const items = room?.items || [];

                                            if (items.length === 0) {
                                                return (
                                                    <tr>
                                                        <td
                                                            colSpan='9'
                                                            style={{
                                                                textAlign:
                                                                    'center',
                                                                padding: '40px',
                                                                color: '#666',
                                                            }}
                                                        >
                                                            No items in this
                                                            room
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return items.map((item, idx) => {
                                                const qty =
                                                    parseFloat(item.quantity) ||
                                                    0;
                                                const budgetPrice = parseFloat(
                                                    item.budgetRate ||
                                                        item.budget_price ||
                                                        0
                                                );
                                                const actualPrice = parseFloat(
                                                    item.actualRate ||
                                                        item.actual_price ||
                                                        0
                                                );
                                                const budgetTotal =
                                                    qty * budgetPrice;
                                                const actualTotal =
                                                    qty * actualPrice;

                                                return (
                                                    <tr key={idx}>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    'center',
                                                                fontSize:
                                                                    '18px',
                                                                width: '40px',
                                                            }}
                                                        >
                                                            {item.favorite
                                                                ? '⭐'
                                                                : ''}
                                                        </td>
                                                        <td
                                                            style={{
                                                                fontWeight:
                                                                    '600',
                                                            }}
                                                        >
                                                            {item.description ||
                                                                item.name ||
                                                                `Item ${
                                                                    idx + 1
                                                                }`}
                                                        </td>
                                                        <td>
                                                            <span className='category-badge'>
                                                                {item.category ||
                                                                    'Other'}
                                                            </span>
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    'center',
                                                            }}
                                                        >
                                                            {qty}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    'right',
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                budgetPrice
                                                            )}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    'right',
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                actualPrice
                                                            )}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    'right',
                                                                fontWeight:
                                                                    '600',
                                                                color: '#667eea',
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                budgetTotal
                                                            )}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    'right',
                                                                fontWeight:
                                                                    '600',
                                                                color: '#764ba2',
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                actualTotal
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`status-badge status-${
                                                                    item.status ||
                                                                    'pending'
                                                                }`}
                                                            >
                                                                {item.status ||
                                                                    'pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Categories */}
                <Card title='📂 Budget by Category' className='categories-card'>
                    {categories.length === 0 ? (
                        <p
                            style={{
                                textAlign: 'center',
                                color: '#666',
                                padding: '20px',
                            }}
                        >
                            No categories found
                        </p>
                    ) : (
                        <div className='categories-list'>
                            {categories.map((cat, index) => (
                                <div key={index} className='category-item'>
                                    <div className='category-info'>
                                        <span className='category-name'>
                                            {cat.category || 'Uncategorized'}
                                        </span>
                                        <span className='category-count'>
                                            {cat.count} items
                                        </span>
                                    </div>
                                    <div className='category-amount'>
                                        {formatCurrency(cat.total)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <style jsx>{`
                .budget-page {
                    max-width: 1000px;
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }

                .page-header h1 {
                    font-size: 2rem;
                    margin: 0;
                    background: linear-gradient(
                        135deg,
                        #667eea 0%,
                        #764ba2 100%
                    );
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .budget-stat {
                    text-align: center;
                }

                .stat-label {
                    font-size: 0.9rem;
                    color: #666;
                    margin-bottom: 8px;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: bold;
                }

                .progress-section {
                    margin-top: 24px;
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-weight: 600;
                    color: #333;
                }

                .progress-percent {
                    color: #667eea;
                    font-size: 1.2rem;
                }

                .progress-bar {
                    height: 24px;
                    background: #e5e5e5;
                    border-radius: 12px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    transition: width 0.5s ease;
                    border-radius: 12px;
                }

                .categories-card {
                    margin-top: 24px;
                }

                .categories-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .category-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: #f9f9f9;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .category-item:hover {
                    background: #f0f0f0;
                    transform: translateX(4px);
                }

                .category-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .category-name {
                    font-weight: 600;
                    color: #333;
                }

                .category-count {
                    font-size: 0.85rem;
                    color: #999;
                }

                .category-amount {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: #667eea;
                }

                .table-wrapper {
                    overflow-x: auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-bottom: 20px;
                }

                .room-breakdown-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 800px;
                    background: white;
                }

                .room-breakdown-table thead {
                    background: linear-gradient(
                        135deg,
                        #667eea 0%,
                        #764ba2 100%
                    );
                    color: white;
                }

                .room-breakdown-table th {
                    padding: 14px 12px;
                    text-align: left;
                    font-size: 0.95rem;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .room-breakdown-table td {
                    padding: 12px;
                    border-bottom: 1px solid #e5e5e5;
                    color: #333;
                    font-size: 0.9rem;
                }

                .room-breakdown-table tbody tr {
                    transition: background-color 0.2s;
                }

                .room-breakdown-table tbody tr:hover {
                    background-color: #f8f9fa;
                }

                .room-breakdown-table .positive {
                    color: #10b981;
                    font-weight: 600;
                }

                .room-breakdown-table .negative {
                    color: #ef4444;
                    font-weight: 600;
                }

                .status-badge {
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .status-completed {
                    background: #d1fae5;
                    color: #065f46;
                }

                .status-in-progress {
                    background: #fef3c7;
                    color: #92400e;
                }

                .status-pending {
                    background: #e0e7ff;
                    color: #3730a3;
                }

                .category-badge {
                    padding: 4px 10px;
                    background: #f0f0f0;
                    border-radius: 4px;
                    fontsize: 0.85rem;
                    font-weight: 500;
                    color: #555;
                }

                @media (max-width: 768px) {
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                    }

                    .stat-value {
                        font-size: 1.5rem;
                    }

                    .room-breakdown-table {
                        font-size: 0.8rem;
                    }

                    .room-breakdown-table th,
                    .room-breakdown-table td {
                        padding: 8px 6px;
                    }
                }
            `}</style>
        </MainLayout>
    );
}

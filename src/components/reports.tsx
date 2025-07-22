import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Card from './ui/Card';
import MetricCard from './ui/metric';
import Button from './ui/Button';
import SimpleChart from './ui/chart';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';

interface ReportsScreenProps {
  onOpenMenu?: () => void;
  onClose?: () => void;
}

export default function ReportsScreen({ onOpenMenu, onClose }: ReportsScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Custom date dropdowns state
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth() + 1);
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [startDay, setStartDay] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [endDay, setEndDay] = useState<number>(new Date().getDate());

  // Dropdown visibility states
  const [showStartMonthDropdown, setShowStartMonthDropdown] = useState(false);
  const [showStartYearDropdown, setShowStartYearDropdown] = useState(false);
  const [showStartDayDropdown, setShowStartDayDropdown] = useState(false);
  const [showEndMonthDropdown, setShowEndMonthDropdown] = useState(false);
  const [showEndYearDropdown, setShowEndYearDropdown] = useState(false);
  const [showEndDayDropdown, setShowEndDayDropdown] = useState(false);

  // Simple period options
  const periodOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'Last 90 Days', value: '90days' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom Range', value: 'custom' }
  ];

  // Generate dropdown options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Update custom dates when dropdowns change
  React.useEffect(() => {
    if (selectedPeriod === 'custom') {
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }
  }, [selectedPeriod, startMonth, startYear, startDay, endMonth, endYear, endDay]);

  // Handle back navigation
  useEffect(() => {
    const backAction = () => {
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Query orders and customers for sales reporting
  const { data, isLoading } = db.useQuery({
    orders: {
      customer: {},
      orderitems: {
        product: {},
        item: {}
      },
      location: {},
      $: {
        order: {
          createdAt: 'desc'
        }
      }
    },
    customers: {
      $: {
        order: {
          createdAt: 'desc'
        }
      }
    }
  });

  const orders = data?.orders || [];
  const customers = data?.customers || [];

  // Get date range based on selected period
  const getDateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      case '30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return { start: thirtyDaysAgo, end: now };
      case '90days':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        return { start: ninetyDaysAgo, end: now };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: null, end: null };
      default:
        return { start: null, end: null };
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Filter orders based on selected period
  const filteredOrders = useMemo(() => {
    if (selectedPeriod === 'all' || !getDateRange.start || !getDateRange.end) {
      return orders;
    }

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= getDateRange.start! && orderDate <= getDateRange.end!;
    });
  }, [orders, selectedPeriod, getDateRange]);

  // Calculate comprehensive sales and order metrics
  const salesMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    // Filter orders by time periods (using filtered orders for selected month)
    const todayOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    const weekOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= thisWeek;
    });

    const monthOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= thisMonth;
    });

    // Calculate sales totals (using filtered orders)
    const totalSales = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const weekSales = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const monthSales = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Calculate order counts (using filtered orders)
    const totalOrderCount = filteredOrders.length;
    const todayOrderCount = todayOrders.length;
    const weekOrderCount = weekOrders.length;
    const monthOrderCount = monthOrders.length;

    // Calculate average order value
    const averageOrderValue = totalOrderCount > 0 ? totalSales / totalOrderCount : 0;
    const todayAverageOrderValue = todayOrderCount > 0 ? todaySales / todayOrderCount : 0;

    // Calculate order status breakdown (using filtered orders)
    const completedOrders = filteredOrders.filter(order => order.status === 'completed').length;
    const pendingOrders = filteredOrders.filter(order => order.status === 'pending').length;
    const processingOrders = filteredOrders.filter(order => order.status === 'processing').length;
    const cancelledOrders = filteredOrders.filter(order => order.status === 'cancelled').length;

    // Calculate payment status breakdown (using filtered orders)
    const paidOrders = filteredOrders.filter(order => order.paymentStatus === 'paid').length;
    const pendingPayments = filteredOrders.filter(order => order.paymentStatus === 'pending').length;

    return {
      totalSales,
      todaySales,
      weekSales,
      monthSales,
      totalOrderCount,
      todayOrderCount,
      weekOrderCount,
      monthOrderCount,
      averageOrderValue,
      todayAverageOrderValue,
      completedOrders,
      pendingOrders,
      processingOrders,
      cancelledOrders,
      paidOrders,
      pendingPayments
    };
  }, [filteredOrders]);

  // Generate chart data based on selected period
  const chartData = useMemo(() => {
    if (selectedPeriod === 'all') {
      // Show last 7 days for "All Time"
      const last7Days = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dayOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === date.getTime();
        });

        const daySales = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

        last7Days.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          value: daySales
        });
      }

      return last7Days;
    } else if (getDateRange.start && getDateRange.end) {
      // Generate chart data for the selected period
      const chartData = [];
      const start = new Date(getDateRange.start);
      const end = new Date(getDateRange.end);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 31) {
        // Show daily data for periods up to 31 days
        for (let i = 0; i < diffDays; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          date.setHours(0, 0, 0, 0);

          const dayOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === date.getTime();
          });

          const daySales = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

          chartData.push({
            label: date.getDate().toString(),
            value: daySales
          });
        }
      } else {
        // Show weekly data for longer periods
        const weeks = Math.ceil(diffDays / 7);
        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(start);
          weekStart.setDate(start.getDate() + (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const weekOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= weekStart && orderDate <= weekEnd;
          });

          const weekSales = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);

          chartData.push({
            label: `W${i + 1}`,
            value: weekSales
          });
        }
      }

      return chartData;
    }

    return [];
  }, [orders, filteredOrders, selectedPeriod, getDateRange]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center" style={{ paddingTop: insets.top }}>
        <Text className="text-gray-600">Loading reports...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Fixed Header */}
      <View className="bg-white border-b border-gray-100">
        <View className="px-4 pt-6 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">Sales & Orders Report</Text>
              <Text className="text-sm text-gray-600">Real-time business performance</Text>
            </View>

            {/* Period Filter Dropdown */}
            <View className="relative">
              <TouchableOpacity
                onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
              >
                <Text className="text-sm font-medium text-gray-700 mr-2">
                  {periodOptions.find(option => option.value === selectedPeriod)?.label || 'All Time'}
                </Text>
                <Feather
                  name={showPeriodDropdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#374151"
                />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              {showPeriodDropdown && (
                <View className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                  <ScrollView className="max-h-64">
                    {periodOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setSelectedPeriod(option.value);
                          setShowPeriodDropdown(false);
                          // Reset custom dates when switching away from custom
                          if (option.value !== 'custom') {
                            setCustomStartDate(null);
                            setCustomEndDate(null);
                          }
                        }}
                        className={`px-4 py-3 border-b border-gray-100 ${
                          selectedPeriod === option.value ? 'bg-blue-50' : ''
                        }`}
                      >
                        <Text className={`text-sm ${
                          selectedPeriod === option.value
                            ? 'text-blue-600 font-medium'
                            : 'text-gray-700'
                        }`}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Custom Date Range Picker - Fixed */}
        {selectedPeriod === 'custom' && (
          <View className="px-4 pt-4 pb-4 bg-white border-b border-gray-100">
            <Text className="text-sm font-medium text-gray-700 mb-4">Select Custom Date Range</Text>

            {/* Start Date */}
            <View className="mb-4">
              <Text className="text-xs text-gray-500 mb-2">From Date</Text>
              <View className="flex-row space-x-2">
                {/* Start Month Dropdown */}
                <View className="flex-1 relative">
                  <TouchableOpacity
                    onPress={() => {
                      setShowStartMonthDropdown(!showStartMonthDropdown);
                      // Close other dropdowns
                      setShowStartDayDropdown(false);
                      setShowStartYearDropdown(false);
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-medium text-gray-800">{months[startMonth - 1]}</Text>
                    <Feather
                      name={showStartMonthDropdown ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  {showStartMonthDropdown && (
                    <View
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-white border border-gray-200"
                      style={{
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {months.map((month, index) => (
                          <TouchableOpacity
                            key={month}
                            onPress={() => {
                              setStartMonth(index + 1);
                              setShowStartMonthDropdown(false);
                            }}
                            className={`px-4 py-3 ${startMonth === index + 1 ? 'bg-blue-50' : ''}`}
                            style={{
                              borderBottomWidth: index < months.length - 1 ? 1 : 0,
                              borderBottomColor: 'rgba(229, 231, 235, 0.5)'
                            }}
                          >
                            <Text className={`text-sm ${startMonth === index + 1 ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                              {month}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Start Day Dropdown */}
                <View className="w-20 relative">
                  <TouchableOpacity
                    onPress={() => {
                      setShowStartDayDropdown(!showStartDayDropdown);
                      // Close other dropdowns
                      setShowStartMonthDropdown(false);
                      setShowStartYearDropdown(false);
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-medium text-gray-800">{startDay}</Text>
                    <Feather
                      name={showStartDayDropdown ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  {showStartDayDropdown && (
                    <View
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-white border border-gray-200"
                      style={{
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {Array.from({ length: getDaysInMonth(startMonth, startYear) }, (_, i) => i + 1).map((day) => (
                          <TouchableOpacity
                            key={day}
                            onPress={() => {
                              setStartDay(day);
                              setShowStartDayDropdown(false);
                            }}
                            className={`px-3 py-2 items-center ${startDay === day ? 'bg-blue-50' : ''}`}
                            style={{
                              borderBottomWidth: day < getDaysInMonth(startMonth, startYear) ? 1 : 0,
                              borderBottomColor: 'rgba(229, 231, 235, 0.5)'
                            }}
                          >
                            <Text className={`text-sm ${startDay === day ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Start Year Dropdown */}
                <View className="w-24 relative">
                  <TouchableOpacity
                    onPress={() => {
                      setShowStartYearDropdown(!showStartYearDropdown);
                      // Close other dropdowns
                      setShowStartMonthDropdown(false);
                      setShowStartDayDropdown(false);
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-medium text-gray-800">{startYear}</Text>
                    <Feather
                      name={showStartYearDropdown ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  {showStartYearDropdown && (
                    <View
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-white border border-gray-200"
                      style={{
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {years.map((year, index) => (
                          <TouchableOpacity
                            key={year}
                            onPress={() => {
                              setStartYear(year);
                              setShowStartYearDropdown(false);
                            }}
                            className={`px-3 py-2 items-center ${startYear === year ? 'bg-blue-50' : ''}`}
                            style={{
                              borderBottomWidth: index < years.length - 1 ? 1 : 0,
                              borderBottomColor: 'rgba(229, 231, 235, 0.5)'
                            }}
                          >
                            <Text className={`text-sm ${startYear === year ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* End Date */}
            <View>
              <Text className="text-xs text-gray-500 mb-2">To Date</Text>
              <View className="flex-row space-x-2">
                {/* End Month Dropdown */}
                <View className="flex-1 relative">
                  <TouchableOpacity
                    onPress={() => {
                      setShowEndMonthDropdown(!showEndMonthDropdown);
                      // Close other dropdowns
                      setShowEndDayDropdown(false);
                      setShowEndYearDropdown(false);
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-medium text-gray-800">{months[endMonth - 1]}</Text>
                    <Feather
                      name={showEndMonthDropdown ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  {showEndMonthDropdown && (
                    <View
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-white border border-gray-200"
                      style={{
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {months.map((month, index) => (
                          <TouchableOpacity
                            key={month}
                            onPress={() => {
                              setEndMonth(index + 1);
                              setShowEndMonthDropdown(false);
                            }}
                            className={`px-4 py-3 ${endMonth === index + 1 ? 'bg-blue-50' : ''}`}
                            style={{
                              borderBottomWidth: index < months.length - 1 ? 1 : 0,
                              borderBottomColor: 'rgba(229, 231, 235, 0.5)'
                            }}
                          >
                            <Text className={`text-sm ${endMonth === index + 1 ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                              {month}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* End Day Dropdown */}
                <View className="w-20 relative">
                  <TouchableOpacity
                    onPress={() => {
                      setShowEndDayDropdown(!showEndDayDropdown);
                      // Close other dropdowns
                      setShowEndMonthDropdown(false);
                      setShowEndYearDropdown(false);
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-medium text-gray-800">{endDay}</Text>
                    <Feather
                      name={showEndDayDropdown ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  {showEndDayDropdown && (
                    <View
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-white border border-gray-200"
                      style={{
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {Array.from({ length: getDaysInMonth(endMonth, endYear) }, (_, i) => i + 1).map((day) => (
                          <TouchableOpacity
                            key={day}
                            onPress={() => {
                              setEndDay(day);
                              setShowEndDayDropdown(false);
                            }}
                            className={`px-3 py-2 items-center ${endDay === day ? 'bg-blue-50' : ''}`}
                            style={{
                              borderBottomWidth: day < getDaysInMonth(endMonth, endYear) ? 1 : 0,
                              borderBottomColor: 'rgba(229, 231, 235, 0.5)'
                            }}
                          >
                            <Text className={`text-sm ${endDay === day ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* End Year Dropdown */}
                <View className="w-24 relative">
                  <TouchableOpacity
                    onPress={() => {
                      setShowEndYearDropdown(!showEndYearDropdown);
                      // Close other dropdowns
                      setShowEndMonthDropdown(false);
                      setShowEndDayDropdown(false);
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-medium text-gray-800">{endYear}</Text>
                    <Feather
                      name={showEndYearDropdown ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  {showEndYearDropdown && (
                    <View
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-white border border-gray-200"
                      style={{
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {years.map((year, index) => (
                          <TouchableOpacity
                            key={year}
                            onPress={() => {
                              setEndYear(year);
                              setShowEndYearDropdown(false);
                            }}
                            className={`px-3 py-2 items-center ${endYear === year ? 'bg-blue-50' : ''}`}
                            style={{
                              borderBottomWidth: index < years.length - 1 ? 1 : 0,
                              borderBottomColor: 'rgba(229, 231, 235, 0.5)'
                            }}
                          >
                            <Text className={`text-sm ${endYear === year ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Selected Range Display */}
            <View className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <Text className="text-xs font-medium text-blue-700 mb-1">Selected Date Range</Text>
              <Text className="text-sm font-semibold text-blue-900">
                {customStartDate?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} - {customEndDate?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Sales Overview Section */}
        <View className="px-4 pt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Sales Overview</Text>

          {/* Today's Sales */}
          <View className="mb-6">
            <Text className="text-sm text-gray-600 mb-2">Today's sales</Text>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(salesMetrics.todaySales)}
            </Text>
            <Text className="text-sm text-gray-600">
              {salesMetrics.todayOrderCount} orders • Avg: {formatCurrency(salesMetrics.todayAverageOrderValue)}
            </Text>
          </View>

          {/* Sales Chart */}
          <Card padding="medium" className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-3">
              Sales Trend ({periodOptions.find(option => option.value === selectedPeriod)?.label})
            </Text>
            <SimpleChart
              data={chartData}
              height={120}
              color="#10B981"
              showLabels={true}
            />
          </Card>

          {/* Sales Metrics Grid */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Sales Metrics</Text>
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Total Sales"
                  value={formatCurrency(salesMetrics.totalSales)}
                  change={{ value: `${salesMetrics.totalOrderCount} orders`, type: "neutral" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="This Week"
                  value={formatCurrency(salesMetrics.weekSales)}
                  change={{ value: `${salesMetrics.weekOrderCount} orders`, type: "increase" }}
                  size="small"
                />
              </View>
            </View>
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="This Month"
                  value={formatCurrency(salesMetrics.monthSales)}
                  change={{ value: `${salesMetrics.monthOrderCount} orders`, type: "increase" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Avg Order Value"
                  value={formatCurrency(salesMetrics.averageOrderValue)}
                  change={{ value: "All time average", type: "neutral" }}
                  size="small"
                />
              </View>
            </View>
          </View>

          {/* Order Status Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Order Status</Text>
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Completed"
                  value={salesMetrics.completedOrders.toString()}
                  change={{ value: "Fulfilled orders", type: "increase" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Processing"
                  value={salesMetrics.processingOrders.toString()}
                  change={{ value: "In progress", type: "neutral" }}
                  size="small"
                />
              </View>
            </View>
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Pending"
                  value={salesMetrics.pendingOrders.toString()}
                  change={{ value: "Awaiting processing", type: "neutral" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Cancelled"
                  value={salesMetrics.cancelledOrders.toString()}
                  change={{ value: "Cancelled orders", type: "decrease" }}
                  size="small"
                />
              </View>
            </View>
          </View>

          {/* Payment Status Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Payment Status</Text>
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Paid Orders"
                  value={salesMetrics.paidOrders.toString()}
                  change={{ value: "Payment received", type: "increase" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Pending Payment"
                  value={salesMetrics.pendingPayments.toString()}
                  change={{ value: "Awaiting payment", type: "neutral" }}
                  size="small"
                />
              </View>
            </View>
          </View>

          {/* Customer Overview */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Customer Overview</Text>
            <View className="flex-row justify-between">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Total Customers"
                  value={customers.length.toString()}
                  change={{ value: "Registered customers", type: "neutral" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Period Filter"
                  value={periodOptions.find(option => option.value === selectedPeriod)?.label || 'All Time'}
                  change={{ value: "Current view", type: "neutral" }}
                  size="small"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

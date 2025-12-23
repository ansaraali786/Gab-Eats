
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCY_SYMBOL } from '../constants';
import { OrderStatus } from '../types';

const MyOrders: React.FC = () => {
  const { orders, currentUser } = useApp();
  
  const myOrders = useMemo(() => {
    return orders.filter(o => o.contactNo === currentUser?.identifier);
  }, [orders, currentUser]);

  const statusSteps: { status: OrderStatus; label: string; icon: string; description: string }[] = [
    { status: 'Pending', label: 'Placed', icon: '📝', description: 'Order received' },
    { status: 'Preparing', label: 'Preparing', icon: '👨‍🍳', description: 'Kitchen is busy' },
    { status: 'Out for Delivery', label: 'On Way', icon: '🚴', description: 'Rider is nearby' },
    { status: 'Delivered', label: 'Delivered', icon: '🎁', description: 'Enjoy your meal!' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'Cancelled') return -1;
    return statusSteps.findIndex(s => s.status === status);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tighter">Track Your Feasts</h1>
        <div className="flex items-center justify-center space-x-2">
          <span className="w-12 h-1 gradient-primary rounded-full"></span>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em]">Active for {currentUser?.identifier}</p>
          <span className="w-12 h-1 gradient-primary rounded-full"></span>
        </div>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-20 text-center border border-gray-100 shadow-sm">
           <div className="text-8xl mb-8 animate-bounce">🍱</div>
           <h2 className="text-3xl font-black text-gray-900 mb-4">No active cravings?</h2>
           <p className="text-gray-400 font-medium mb-10 max-w-sm mx-auto">Your order history is empty. Let's find you something delicious to track!</p>
           <a href="#/" className="gradient-primary text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-orange-100 inline-block transition-transform hover:scale-105">Start Ordering</a>
        </div>
      ) : (
        <div className="space-y-10">
          {myOrders.map(order => {
            const currentStepIdx = getStepIndex(order.status);
            const isCancelled = order.status === 'Cancelled';

            return (
              <div key={order.id} className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-50 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-40 h-40 opacity-5 rounded-bl-full transition-colors ${isCancelled ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                
                <div className="flex flex-wrap justify-between items-start gap-8 mb-12 relative z-10">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest">#{order.id.toUpperCase()}</span>
                      <span className="text-gray-400 font-bold text-sm">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {order.items[0]?.restaurantName || 'Gourmet Feast'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map(item => (
                        <span key={item.id} className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-bold border border-orange-100/50">
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Total Bill</div>
                    <div className="text-4xl font-black text-gray-900 tracking-tighter">{CURRENCY_SYMBOL} {order.total}</div>
                  </div>
                </div>

                {/* Tracking Stepper */}
                {!isCancelled ? (
                  <div className="relative pt-10 pb-4">
                    {/* Connection Line */}
                    <div className="absolute top-[68px] left-[10%] right-[10%] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full gradient-secondary transition-all duration-1000 ease-out"
                        style={{ width: `${(currentStepIdx / (statusSteps.length - 1)) * 100}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-4 relative z-10">
                      {statusSteps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIdx;
                        const isActive = idx === currentStepIdx;

                        return (
                          <div key={step.status} className="flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-all duration-500 ${
                              isCompleted 
                                ? 'gradient-secondary text-white scale-110' 
                                : 'bg-white text-gray-300 border-2 border-gray-100'
                            } ${isActive ? 'animate-pulse shadow-teal-200' : ''}`}>
                              {step.icon}
                            </div>
                            <div className="mt-4">
                              <span className={`block text-xs font-black uppercase tracking-wider ${isCompleted ? 'text-teal-600' : 'text-gray-300'}`}>
                                {step.label}
                              </span>
                              <p className={`text-[10px] font-bold mt-1 max-w-[80px] leading-tight ${isActive ? 'text-gray-500' : 'text-transparent group-hover:text-gray-300 transition-colors'}`}>
                                {step.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center text-3xl">🚫</div>
                    <div>
                      <h4 className="text-xl font-black text-rose-600">Order Cancelled</h4>
                      <p className="text-rose-400 font-bold text-sm">This order was cancelled. Please contact support if you have questions.</p>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between items-center">
                   <div className="flex items-center text-teal-600 font-bold text-xs uppercase tracking-widest">
                      <span className="flex h-2 w-2 relative mr-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                      </span>
                      Live Updates Active
                   </div>
                   <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-600 transition-colors">
                      Download Invoice
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

#!/usr/bin/env node

/**
 * wiws Walk-in Workflow Test Script
 * 
 * This script tests the complete walk-in workflow:
 * 1. Reception → Create visit
 * 2. PA → Approve visit and assign consultant  
 * 3. Consultant → Start session and complete
 * 4. Admin → View analytics and export data
 */

const API_BASE = 'http://localhost:8787';

// Test data
const TEST_VISITOR = {
  name: 'John Doe',
  phone: '9876543210',
  service_id: 1,
  notes: 'Test visitor for workflow verification',
  reception_id: 'reception-001'
};

const TEST_USERS = {
  reception: 'reception-001',
  pa: 'pa-001', 
  consultant: 'consultant-001',
  admin: 'admin-001'
};

class WorkflowTester {
  constructor() {
    this.visitId = null;
    this.token = null;
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || result.message || 'Unknown error'}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Request failed: ${method} ${endpoint}`, error.message);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('\n🔍 Testing health check...');
    const result = await this.makeRequest('GET', '/health');
    console.log('✅ Health check:', result.status);
    return result.status === 'healthy';
  }

  async seedDatabase() {
    console.log('\n🌱 Seeding database...');
    const result = await this.makeRequest('POST', '/seed');
    console.log('✅ Database seeded:', `${result.services} services, ${result.users} users`);
    return true;
  }

  async testGetServices() {
    console.log('\n📋 Testing get services...');
    const result = await this.makeRequest('GET', '/api/services');
    console.log('✅ Services loaded:', result.data.services.length);
    return result.data.services.length > 0;
  }

  async testCreateVisit() {
    console.log('\n👤 Testing visit creation (Reception)...');
    const result = await this.makeRequest('POST', '/api/visits', TEST_VISITOR);
    
    this.visitId = result.data.visit.id;
    this.token = result.data.visit.token;
    
    console.log('✅ Visit created:', `ID: ${this.visitId}, Token: ${this.token}`);
    return this.visitId && this.token;
  }

  async testApproveVisit() {
    console.log('\n✅ Testing visit approval (PA)...');
    const approvalData = {
      status: 'approved',
      assigned_consultant_id: TEST_USERS.consultant,
      pa_id: TEST_USERS.pa,
      notes: 'Approved and assigned to consultant'
    };
    
    const result = await this.makeRequest('PUT', `/api/visits/${this.visitId}/status`, approvalData);
    console.log('✅ Visit approved:', `Status: ${result.data.visit.status}, Consultant: ${result.data.visit.assignedConsultant}`);
    return result.data.visit.status === 'approved';
  }

  async testStartSession() {
    console.log('\n🎯 Testing session start (Consultant)...');
    const sessionData = {
      status: 'in_session',
      notes: 'Session started with client'
    };
    
    const result = await this.makeRequest('PUT', `/api/visits/${this.visitId}/status`, sessionData);
    console.log('✅ Session started:', `Status: ${result.data.visit.status}`);
    return result.data.visit.status === 'in_session';
  }

  async testCompleteSession() {
    console.log('\n🏁 Testing session completion (Consultant)...');
    const completionData = {
      status: 'completed',
      session_notes: 'Session completed successfully. Provided tax advisory guidance.'
    };
    
    const result = await this.makeRequest('PUT', `/api/visits/${this.visitId}/status`, completionData);
    console.log('✅ Session completed:', `Status: ${result.data.visit.status}`);
    return result.data.visit.status === 'completed';
  }

  async testTodayVisits() {
    console.log('\n📊 Testing today visits query...');
    const result = await this.makeRequest('GET', '/api/visits/today');
    console.log('✅ Today visits:', result.data.visits.length);
    return result.data.visits.length > 0;
  }

  async testAnalytics() {
    console.log('\n📈 Testing analytics dashboard...');
    const result = await this.makeRequest('GET', '/api/analytics/dashboard');
    console.log('✅ Analytics loaded:', `${result.data.today.total_visits} total visits today`);
    return result.data.today.total_visits > 0;
  }

  async testAuditTrail() {
    console.log('\n📝 Testing audit trail...');
    const result = await this.makeRequest('GET', '/api/analytics/audit?limit=10');
    // Check if audit_records exists in the response
    const auditRecords = result.data.audit_records || result.data.records || [];
    console.log('✅ Audit records:', auditRecords.length);
    return auditRecords.length > 0;
  }

  async testCSVExport() {
    console.log('\n💾 Testing CSV export...');
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await fetch(`${API_BASE}/api/analytics/export?start_date=${today}&end_date=${today}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const csvContent = await response.text();
      console.log('✅ CSV export successful:', `${csvContent.split('\n').length - 1} data rows`);
      return csvContent.includes('Token') && csvContent.includes(this.token);
    } catch (error) {
      console.error('❌ CSV export failed:', error.message);
      return false;
    }
  }

  async testSSEConnection() {
    console.log('\n🔄 Testing SSE connection...');
    
    return new Promise((resolve) => {
      const eventSource = new EventSource(`${API_BASE}/api/stream?role=admin&user_id=test`);
      
      const timeout = setTimeout(() => {
        eventSource.close();
        console.log('❌ SSE connection timeout');
        resolve(false);
      }, 5000);
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        clearTimeout(timeout);
        eventSource.close();
        resolve(true);
      };
      
      eventSource.onerror = (error) => {
        console.log('❌ SSE connection error:', error);
        clearTimeout(timeout);
        eventSource.close();
        resolve(false);
      };
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'connection') {
          console.log('✅ SSE connection confirmed:', data.data.message);
          clearTimeout(timeout);
          eventSource.close();
          resolve(true);
        }
      };
    });
  }

  async runFullWorkflowTest() {
    console.log('🚀 Starting wiws Walk-in Workflow Test Suite\n');
    console.log('=' .repeat(60));
    
    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Database Seeding', fn: () => this.seedDatabase() },
      { name: 'Get Services', fn: () => this.testGetServices() },
      { name: 'Create Visit (Reception)', fn: () => this.testCreateVisit() },
      { name: 'Approve Visit (PA)', fn: () => this.testApproveVisit() },
      { name: 'Start Session (Consultant)', fn: () => this.testStartSession() },
      { name: 'Complete Session (Consultant)', fn: () => this.testCompleteSession() },
      { name: 'Today Visits Query', fn: () => this.testTodayVisits() },
      { name: 'Analytics Dashboard', fn: () => this.testAnalytics() },
      { name: 'Audit Trail', fn: () => this.testAuditTrail() },
      { name: 'CSV Export', fn: () => this.testCSVExport() },
      // Note: SSE test requires Node.js with EventSource support or browser environment
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
          console.log(`❌ ${test.name} - Test returned false`);
        }
      } catch (error) {
        failed++;
        console.log(`❌ ${test.name} - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! wiws workflow is ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the API server and database.');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Open the preview browser to test the frontend');
    console.log('2. Test each role dashboard (Reception, PA, Consultant, Admin)');
    console.log('3. Verify real-time updates work across multiple browser tabs');
    console.log('4. Deploy to Cloudflare Pages/Workers when ready');
    
    return failed === 0;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  const tester = new WorkflowTester();
  tester.runFullWorkflowTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = WorkflowTester;
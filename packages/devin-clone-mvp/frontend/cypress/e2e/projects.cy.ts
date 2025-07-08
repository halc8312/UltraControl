describe('Projects', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/auth/session', {
      statusCode: 200,
      body: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          subscription_plan: 'free'
        }
      }
    }).as('getSession')

    cy.visit('/projects')
    cy.wait('@getSession')
  })

  it('should display projects page', () => {
    cy.get('h1').should('contain', 'プロジェクト')
    cy.get('[data-testid="create-project-button"]').should('be.visible')
  })

  it('should show empty state when no projects', () => {
    cy.intercept('GET', '/api/v1/projects*', {
      statusCode: 200,
      body: {
        projects: [],
        total: 0,
        page: 1,
        page_size: 20
      }
    }).as('getProjects')

    cy.visit('/projects')
    cy.wait('@getProjects')
    
    cy.get('[data-testid="empty-state"]').should('be.visible')
    cy.get('[data-testid="empty-state"]').should('contain', 'プロジェクトがありません')
  })

  it('should open create project dialog', () => {
    cy.get('[data-testid="create-project-button"]').click()
    cy.get('[data-testid="create-project-dialog"]').should('be.visible')
    cy.get('[data-testid="project-name-input"]').should('be.visible')
  })

  it('should create a new project', () => {
    const projectName = 'Test Project'
    const projectDescription = 'Test Description'

    cy.intercept('POST', '/api/v1/projects', {
      statusCode: 201,
      body: {
        id: 'test-project-id',
        name: projectName,
        description: projectDescription,
        language: 'python',
        template: 'blank'
      }
    }).as('createProject')

    cy.get('[data-testid="create-project-button"]').click()
    cy.get('[data-testid="project-name-input"]').type(projectName)
    cy.get('[data-testid="project-description-input"]').type(projectDescription)
    cy.get('[data-testid="project-language-select"]').click()
    cy.get('[data-value="python"]').click()
    cy.get('[data-testid="create-project-submit"]').click()

    cy.wait('@createProject')
    cy.url().should('include', '/projects/test-project-id')
  })

  it('should display project list', () => {
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Project 1',
        description: 'Description 1',
        language: 'python',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'project-2',
        name: 'Project 2',
        description: 'Description 2',
        language: 'javascript',
        created_at: '2024-01-02T00:00:00Z'
      }
    ]

    cy.intercept('GET', '/api/v1/projects*', {
      statusCode: 200,
      body: {
        projects: mockProjects,
        total: 2,
        page: 1,
        page_size: 20
      }
    }).as('getProjects')

    cy.visit('/projects')
    cy.wait('@getProjects')

    cy.get('[data-testid="project-card"]').should('have.length', 2)
    cy.get('[data-testid="project-card"]').first().should('contain', 'Project 1')
    cy.get('[data-testid="project-card"]').last().should('contain', 'Project 2')
  })

  it('should delete a project', () => {
    cy.intercept('DELETE', '/api/v1/projects/*', {
      statusCode: 204
    }).as('deleteProject')

    cy.get('[data-testid="project-menu"]').first().click()
    cy.get('[data-testid="delete-project-button"]').click()
    
    // Confirm deletion
    cy.get('[data-testid="confirm-dialog"]').should('be.visible')
    cy.get('[data-testid="confirm-delete"]').click()

    cy.wait('@deleteProject')
  })

  it('should navigate to project detail', () => {
    cy.get('[data-testid="project-card"]').first().click()
    cy.url().should('include', '/projects/')
  })
})
import {EventEmitter, Injectable} from '@angular/core';
import {catchError, tap} from 'rxjs/operators';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {Story} from '../model/Story';
import {Observable, of, throwError} from 'rxjs';
import {StepType} from '../model/StepType';
import {Scenario} from '../model/Scenario';
import {Background} from '../model/Background';
import {User} from '../model/User';
import {RepositoryContainer} from '../model/RepositoryContainer';
import { Block } from '../model/Block';

/**
 * Service to communicate between components and the backend
 */
@Injectable({
    providedIn: 'root'
})

export class ApiService {

    /**
     * @ignore
     */
    constructor(private http: HttpClient) {
    }

    /**
     * url of the backend
     */
    public apiServer: string = localStorage.getItem('url_backend');

    /**
     * If the backend url was received
     */
    public urlReceived = false;

    /**
     * Event Emitter if the stories could not be retrieved
     */
    public storiesErrorEvent = new EventEmitter();

    /**
     * Event Emitter to distribute the stories to all components
     */
    public getStoriesEvent = new EventEmitter();

    /**
     * Event Emitter to signal that the backend url is available
     */
    public getBackendUrlEvent = new EventEmitter();

    /**
     * Event Emitter to distribute the repositories to all components
     */
    public getRepositoriesEvent = new EventEmitter();

    /**
     * Event emitter to save the story / scenario and then run the test
     */
    public runSaveOptionEvent = new EventEmitter();

    /**
     * Event emitter to add a block to the current scenario
     */
    public addBlockToScenarioEvent = new EventEmitter();

    /**
     * Event emitter to logout the user
     */
    public logoutEvent = new EventEmitter();

    /**
     * Event emitter to rename the scenario
     */
    public renameScenarioEvent = new EventEmitter();

    /**
     * Event emitter to delete the scenario
     */
    public deleteScenarioEvent = new EventEmitter();

    /**
     * Event emitter to create a custom story
     */
    public createCustomStoryEmitter: EventEmitter<any> = new EventEmitter();

    /**
     * Gets api headers
     * @returns 
     */
    public static getOptions() {
        return { withCredentials: true};
    }

    /**
     * Emits the run save option
     * @param option 
     */
    public runSaveOption(option: String){
        this.runSaveOptionEvent.emit(option)
    }

    /**
     * Emits the delete scenario event
     */
    public deleteScenarioEmitter(){
        this.deleteScenarioEvent.emit()
    }

    /**
     * Handles http error
     * @param error 
     * @returns 
     */
    static handleError(error: HttpErrorResponse) {
        console.log(JSON.stringify(error));
        return throwError(error);
    }

    /**
     * Emits the rename scenario event
     * @param newTitle 
     */
    renameScenarioEmit(newTitle){
        this.renameScenarioEvent.emit(newTitle);
    }

    /**
     * Retrieves the blocks
     * @param repoId id of the project of the blocks
     * @returns 
     */
    getBlocks(repoId: string): Observable<Block[]> {
        const str = this.apiServer + '/mongo/getBlocks/' + repoId;
        return this.http.get<Block[]>(str,  ApiService.getOptions())
        .pipe(tap(resp => {}),
        catchError(ApiService.handleError));
      }

    /**
     * Emits the add block to scenario event
     * @param block 
     * @param correspondingComponent 
     */
    addBlockToScenario(block: Block, correspondingComponent: string){
        this.addBlockToScenarioEvent.emit([correspondingComponent, block])
    }

    /**
     * Starts the github login
     */
    public githubLogin() {
        const scope = 'repo';
        const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
        const s = `${AUTHORIZE_URL}?scope=${scope}&client_id=${localStorage.getItem('clientId')}`;
        window.location.href = s;
    }

    /**
     * Returns the callback from github to the backend
     * @param code 
     * @returns 
     */
    githubCallback(code: string): Observable<any>{
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/callback?code=' + code;
        return this.http.get(str, {withCredentials: true})
            .pipe(tap(resp => {}),
            catchError(ApiService.handleError));
    }

    /**
     * Retrieves a report
     * @param reportName 
     * @returns 
     */
    getReport(reportName: string) {
        this.apiServer = localStorage.getItem('url_backend');
        if (this.apiServer) {
            const str = this.apiServer + '/run/report/' + reportName;
            return this.http.get(str,  { responseType: 'text', withCredentials: true})
                .pipe(tap(resp => {}),
                catchError(ApiService.handleError));
        }
    }

    /**
     * Deletes a block
     * @param blockId 
     * @returns 
     */
    deleteBlock(blockId: string) {
        const str = this.apiServer + '/mongo/deleteBlock/' + blockId;
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(resp => {

        }),
          catchError(ApiService.handleError));
      }

    /**
     * Retrieves the repositories
     * @returns 
     */
    getRepositories(): Observable<RepositoryContainer[]> {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/user/repositories';

        return this.http.get<RepositoryContainer[]>(str, ApiService.getOptions())
          .pipe(tap(resp => {
            this.getRepositoriesEvent.emit(resp);
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Disconnects the user from github
     * @returns 
     */
    disconnectGithub() {
        const str = this.apiServer + '/github/disconnectGithub';
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(resp => {
          // this.getStoriesEvent.emit(resp);
        }),
          catchError(ApiService.handleError));
    }

    /**
     * Loggs in the user with a github token
     * @param login 
     * @param id 
     * @returns 
     */
    loginGithubToken(login: string, id): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/githubLogin';
        const user = {login, id};

        return this.http.post<any>(str, user, ApiService.getOptions())
          .pipe(tap(resp => {
            // this.getStoriesEvent.emit(resp);
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Loggs in a user
     * @param email 
     * @param password 
     * @param stayLoggedIn 
     * @returns 
     */
    loginUser(user): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/login';

        return this.http.post<any>(str, user, ApiService.getOptions())
          .pipe(tap(resp => {

            // this.getStoriesEvent.emit(resp);
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Loggs in the user into jira
     * @param jiraName 
     * @param jiraPassword 
     * @param jiraServer 
     * @returns 
     */
    jiraLogin(jiraName: string, jiraPassword: string, jiraServer: string) {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {  jiraAccountName: jiraName,
                            jiraPassword: jiraPassword,
                            jiraServer: jiraServer};
        return this.http.post(this.apiServer + '/jira/login', body, ApiService.getOptions())
            .pipe(tap(resp => {
                localStorage.setItem('JiraSession', resp.toString());
            }));
    }

    /**
     * Creates a new repository / project
     * @param name 
     * @returns 
     */
    createRepository(name: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        console.log(this.apiServer);
        const body = {'name' : name};
        return this.http
            .post<any>(this.apiServer + '/mongo/createRepository/', body, ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

    /**
     * Get's single Story by ID
     * @param _id storyID
     * @param source repoSource
     * @return single Story object
     */
    public getStory(_id, source): Observable<any>{
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<Story>(this.apiServer + '/story/' + _id + '/' + source, ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

    /**
     * Creates a story
     * @param title
     * @param description
     * @param repository
     * @param _id id of the repository
     * @returns
     */
    public createStory(title: string, description: string, repository: string, _id: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'title': title, 'description': description, 'repo': repository, '_id': _id};
        return this.http
            .post<Story>(this.apiServer + '/story/', body, ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

    /**
     * updates a Story
     * @param story updatedStory
     */
    public updateStory(story: Story): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .put<Story>(this.apiServer + '/story', story, ApiService.getOptions())
            .pipe(tap(resp =>{
            }));
    }

    /**
     * deletes a Story
     * @param _id StoryID
     */
    public deleteStory(_id): Observable<any>{
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'_id' : _id};
        return this.http
            .delete<any>(this.apiServer + '/story/' + _id, ApiService.getOptions())
            .pipe(tap(resp =>{
            }));
    }

/*for RESET URL GET von FRONTEND??? console logn neeeded? Get from frontend not backend / Get URLS BAckend??*/
    /**
     * Requests a password request
     * @param email
     * @returns
     */
  public requestReset(email: string): Observable <any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'email' : email};
        return this.http
            .post<any>(this.apiServer + '/user/resetpassword/', body)
            .pipe(tap(resp => {
            }));
    }

    /**
     * Changes the old password with the new password
     * @param uuid 
     * @param password 
     * @returns 
     */
    confirmReset(uuid: string, password: string): Observable <any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'uuid' : uuid, 'password' : password};
        return this.http
            .patch<any>(this.apiServer + '/user/reset', body)
            .pipe(tap(resp => {
                //
            }));
    }


    /**
     * Adds a user to a workgroup
     * @param _id 
     * @param user 
     * @returns 
     */
    addToWorkgroup(_id: string, user){
        return this.http
        .post<any>(this.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    /**
     * Updates a user in a workgroup
     * @param _id 
     * @param user 
     * @returns 
     */
    updateWorkgroupUser(_id: string, user){
        return this.http
        .put<any>(this.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    /**
     * Retrieves a workgroup
     * @param _id 
     * @returns 
     */
    getWorkgroup(_id: string){
        return this.http
        .get<any>(this.apiServer + '/workgroups/wgmembers/' + _id, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    /**
     * Removes a user from a workgroup
     * @param _id 
     * @param email 
     * @returns 
     */
    removeFromWorkgroup(_id: string, email: string){
        let user = {email}
        return this.http
        .post<any>(this.apiServer + '/workgroups/deletemember/' + _id, user, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    /**
     * Saves a new block
     * @param block 
     * @returns 
     */
    saveBlock(block: Block){
        return this.http
        .post<any>(this.apiServer + '/mongo/saveBlock', block, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    /**
     * Loggs out the user
     * @returns 
     */
    logoutUser() {
        const url = this.apiServer + '/user/logout';
        localStorage.removeItem('login');
        return  this.http.get<string[]>(url, ApiService.getOptions())
          .pipe(tap(resp => {
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Handles the error from retrieve stories
     * @param error 
     * @param caught 
     * @returns 
     */
    handleStoryError = (error: HttpErrorResponse, caught: Observable<any>) => {
        this.storiesErrorEvent.emit();
        return of([]);
    }

    /**
     * Emitts the create custom story event
     * @param story 
     */
    createCustomStoryEvent(story){
        this.createCustomStoryEmitter.emit(story)
    }

    /**
     * Retrieves the backend info for all api request necessary
     * @returns 
     */
    getBackendInfo(): Promise<any> {
        const url = localStorage.getItem('url_backend');
        const clientId = localStorage.getItem('clientId');
        const version = localStorage.getItem('version');

        if (url && url !== 'undefined' && clientId && clientId !== 'undefined' && version && version !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
            return Promise.resolve(url);
        } else {

        return this.http.get<any>(window.location.origin + '/backendInfo', ApiService.getOptions()).toPromise().then((backendInfo) => {
             localStorage.setItem('url_backend', backendInfo.url);
             localStorage.setItem('clientId', backendInfo.clientId);
             localStorage.setItem('version', backendInfo.version);
             this.getBackendUrlEvent.emit();
         });
        }
    }

    /**
     * Retrieves the stories
     * @param repository 
     * @returns 
     */
    getStories(repository: RepositoryContainer): Observable<Story[]> {
        this.apiServer = localStorage.getItem('url_backend');
        let params;
        if (repository.source === 'github') {
            const repo = repository.value.split('/');
            params = { repoName: repository.value, githubName: repo[0], repository: repo[1], source: repository.source, id: repository._id};
        } else if (repository.source === 'jira') {
            params = {projectKey: repository.value, source: repository.source, id: repository._id};
        } else if (repository.source === 'db') {
            params = {repoName: repository.value, source: repository.source, id: repository._id};
        }

        return this.http
            .get<Story[]>(this.apiServer + '/user/stories/', {params, withCredentials: true})
            .pipe(tap(resp => {
                console.log('Resp');
                console.log(resp);
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    /**
     * Creates a jira account
     * @param request 
     * @returns 
     */
    createJiraAccount(request) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/jira/user/create/', request, ApiService.getOptions())
            .pipe(tap(resp => {
                //console.log(resp.body);
            }));
    }

    /**
     * Retrieves the step types
     * @returns 
     */
    getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes', ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

    /**
     * Registers a user for a seed-test account
     * @param email 
     * @param password 
     * @param userId 
     * @returns 
     */
    registerUser(email: string, password: string, userId: any): Observable<any> {
        const user = {email, password, userId};
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/user/register', user)
            .pipe(tap(resp => {
            }), catchError((err, caught) => {
                return new Observable(subscriber => {
                    subscriber.next(err)
                    subscriber.complete();
                })
            }));
    }

    /**
     * Updates a user
     * @param userID 
     * @param user 
     * @returns 
     */
    updateUser(userID: string, user: User): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<User>(this.apiServer + '/mongo/user/update/' + userID, user)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    /**
     * Deletes a seed-test user
     * @returns 
     */
    deleteUser() {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/user/delete', ApiService.getOptions())
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    /**
     * Merges Seed-Test account and github account
     * @param userId 
     * @param login 
     * @param id 
     * @returns 
     */
    mergeAccountGithub(userId: string, login: string, id: any) {
        const str = this.apiServer + '/user/mergeGithub';
        const obj = {userId, login, id};

        return this.http.post<any>(str, obj, ApiService.getOptions())
        .pipe(tap(resp => {
          // this.getStoriesEvent.emit(resp);
        }),
          catchError(ApiService.handleError));
    }

    /**
     * Retrieves data of the user
     * @returns 
     */
    getUserData(): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<User>(this.apiServer + '/mongo/user/', ApiService.getOptions())
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    /**
     * Adds a Scenario
     * @param storyID 
     * @param storySource 
     * @returns 
     */
    addScenario(storyID: any, storySource: string): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/story/' + storyID + '/' + storySource, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }

    /**
     * get's single Scenario
     * @param storyID
     * @param storySource
     * @param scenarioID
     */
    getScenario(storyID: any, storySource, scenarioID): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<any>(this.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenarioID, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Get scenario in story ' + storyID + '!', resp)
            }));
    }

    /**
     * Updates the background
     * @param storyID 
     * @param storySource 
     * @param background 
     * @returns 
     */

    public updateBackground(storyID: any, storySource: string, background: Background): Observable<Background> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<Background>(this.apiServer + '/mongo/background/update/' + storyID + '/' + storySource, background, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update background for story ' + storyID )
            }));
    }


    public addFirstScenario(storyID, storySource: string): Observable<Scenario>{
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<any>(this.apiServer + '/mongo/scenario/add/' + storyID + '/' + storySource, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }

    /**
     * Submitts an issue to github to create a new step
     * @param obj 
     * @returns 
     */
    submitGithub(obj) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/github/submitIssue/', obj, ApiService.getOptions());
    }

    /**
     * Updates the scenario
     * @param storyID 
     * @param storySource 
     * @param scenario updatedScenario
     * @returns 
     */
    updateScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .put<any>(this.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenario.scenario_id, scenario, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    /**
     * Deletes a report
     * @param reportId 
     * @returns 
     */
    deleteReport(reportId): Observable<any> {
        console.log('delete reportId', reportId)
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/run/report/' + reportId, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    /**
     * Marks a report as saved in the report history
     * @param reportId 
     * @returns 
     */
    saveReport(reportId): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<any>(this.apiServer + '/run/saveReport/' + reportId, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    /**
     * Marks a saved report as not saved
     * @param reportId 
     * @returns 
     */
    unsaveReport(reportId): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<any>(this.apiServer + '/run/unsaveReport/' + reportId, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    /**
     * Deletes the background
     * @param storyID 
     * @param storySource 
     * @returns 
     */
    deleteBackground(storyID: any, storySource: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID + '/' + storySource, ApiService.getOptions() )
            .pipe(tap(resp => {
                //  console.log('Delete background for story ' + storyID )
            }));
    }

    /**
     * Deletes a scenario
     * @param storyID 
     * @param storySource 
     * @param scenario 
     * @returns 
     */
    deleteScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenario.scenario_id , ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
            }));
    }

    /**
     * Runs a test of a scenario or story
     * @param storyID 
     * @param storySource 
     * @param scenarioID 
     * @param params 
     * @returns 
     */
    runTests(storyID: any, storySource: string, scenarioID: number, params) {
        this.apiServer = localStorage.getItem('url_backend');
        let timeout = 600000;
        if (scenarioID) {
            return this.http
                .post(this.apiServer + '/run/Scenario/' + storyID + '/' + storySource + '/' + scenarioID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` })});
        }
        return this.http
            .post(this.apiServer + '/run/Feature/' + storyID + '/' + storySource, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` })});
    }


    /**
     * Retrieves the report history of a story
     * @param storyId 
     * @returns 
     */
    getReportHistory(storyId: string){
        return this.http
            .get<any>(this.apiServer + '/run/reportHistory/' + storyId, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }

    // public changeDaisy(){
    //    this.apiServer = localStorage.getItem('url_backend');
    //    return this.http.get(this.apiServer + '/user/daisy')
    // }

    /**
     * If the user is logged in
     * @returns 
     */
    isLoggedIn(): boolean {
        // if (this.cookieService.check('connect.sid')) return true;
        // return false;
        if (localStorage.getItem('login')) { return true; }
        return false;
    }

    /**
     * If the repo is github repo
     * @param repo 
     * @returns 
     */
    isGithubRepo(repo: RepositoryContainer): boolean {
        return ( repo.source === 'github');
    }

    /**
     * If the repo is a jira repo
     * @param repo 
     * @returns 
     */
    isJiraRepo(repo: RepositoryContainer): boolean {
        return ( repo.source === 'jira');
    }

    /**
     * If the repo is a custom project
     * @param repo 
     * @returns 
     */
    isCustomRepo(repo: RepositoryContainer): boolean {
        return ( repo.source === 'db');
    }
}

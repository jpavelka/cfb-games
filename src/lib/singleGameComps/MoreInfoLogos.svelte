<script lang='ts'>
    import type { Team } from '$lib/types'
    export let team: Team;
</script>

<div class='teamDiv'>
    <img class=logoImg class:noLogo={!!!team.logo} src={team.logo} alt={team.displayName}>
    <div class=teamName>
        {team.ranked ? `${team.rank}. ` : ''}
        {window.innerWidth < 500 ? team.abbreviation : (
            window.innerWidth < 800 ? team.school : team.displayName)
        }
    </div>
    <div class=recordsText>
        {team.classification === 'FBS' ? team.conference : (
            !!team.conference ? `${team.conference} (${team.classification})` : (
                team.school == 'TBD' ? '' : `NCAA Div II`
            )
        )}
    </div>
    <div class=recordsText>
        {!!team.recordOverall ? team.recordOverall : ''}
        {!!team.recordConference ? ` (${team.recordConference})` : ''}
    </div>
</div>

<style>
    .teamDiv {
        flex: 1 1 0;
        width: 0;
    }
    .logoImg {
        height: 15vw;
        width: 15vw;
        display: block;
        margin-left: auto;
        margin-right: auto;
    }
    .teamName {
        font-size: 1.3em;
        text-align: center;
    }
    .recordsText {
        font-size: 1.1em;
        text-align: center;
    }
    .noLogo {
        overflow: hidden;
        opacity: 0;
    }
</style>